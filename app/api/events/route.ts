type AirtableFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[]
  | null
  | undefined;

type AirtableRecord = {
  id: string;
  fields: Record<string, AirtableFieldValue>;
};

type LinkedRecordMap = Record<string, string>;

const FIELD_MAP = {
  title: "Name",
  officialTitle: "Official Name",
  start: "Event Start Datetime",
  end: "Event End Datetime",
  venue: "Venue",
  room: "Room",
  eventType: "Type",
  status: "Status",
} as const;

function asString(value: AirtableFieldValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "number") return String(item);
        if (typeof item === "boolean") return String(item);
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function asLinkedRecordIds(value: AirtableFieldValue): string[] {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string"
    );
  }

  return [];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeAirtableString(value: string): string {
  return value.replace(/'/g, "\\'");
}

function getEventColors(eventType: string) {
  switch (eventType) {
    case "Rehearsal":
      return {
        backgroundColor: "rgb(98,161,201)",
        borderColor: "rgb(80,155,193)",
        textColor: "#ffffff",
      };
    case "Concert":
      return {
        backgroundColor: "rgb(53, 89, 176)",
        borderColor: "rgb(41, 87, 174)",
        textColor: "#ffffff",
      };
    case "Tuning/Touchup":
      return {
        backgroundColor: "rgb(88, 48, 186)",
        borderColor: "rgb(92, 47, 184)",
        textColor: "#ffffff",
      };

    case "Production":
      return {
        backgroundColor: "rgb(176, 3, 47)",
        borderColor: "rgb(161, 33, 51)",
        textColor: "#ffffff",
      };

    case "Masterclass":
      return {
        backgroundColor: "rgb(170, 55, 1)",
        borderColor: "rgb(157, 23, 65)",
        textColor: "#ffffff",
      };

    default:
      return {
        backgroundColor: "rgb(2,177,170)",
        borderColor: "#rgb(79,174,169)",
        textColor: "#ffffff",
      };
  }
}

async function fetchAllRecordsFromTable({
  baseId,
  tableId,
  token,
  fields,
}: {
  baseId: string;
  tableId: string;
  token: string;
  fields?: string[];
}): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    fields?.forEach((field, index) => {
      url.searchParams.set(`fields[${index}]`, field);
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable fetch failed for ${tableId}: ${errorText}`);
    }

    const data = await response.json();

    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

async function buildPrimaryFieldMap({
  baseId,
  tableId,
  token,
  primaryField,
}: {
  baseId: string;
  tableId: string;
  token: string;
  primaryField: string;
}): Promise<LinkedRecordMap> {
  const records = await fetchAllRecordsFromTable({
    baseId,
    tableId,
    token,
    fields: [primaryField],
  });

  return Object.fromEntries(
    records.map((record) => [
      record.id,
      asString(record.fields[primaryField]),
    ])
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const start = searchParams.get("start"); //start datetime
  const end = searchParams.get("end"); //end datetime
  const venueFilter = searchParams.get("venue");
  const production = searchParams.get("production") === "true"; //production checkbox

  const baseId = process.env.AIRTABLE_BASE_ID;
  const eventsTableName = process.env.AIRTABLE_TABLE_NAME;
  const venuesTableName = process.env.AIRTABLE_VENUES_TABLE_NAME;
  const roomsTableName = process.env.AIRTABLE_ROOMS_TABLE_NAME;
  const token = process.env.AIRTABLE_TOKEN;

  if (!baseId || !eventsTableName || !venuesTableName || !roomsTableName || !token) {
    return Response.json(
      { error: "Missing Airtable environment variable" },
      { status: 500 }
    );
  }

  try {
    const [venueNameById, roomNameById] = await Promise.all([
      buildPrimaryFieldMap({
        baseId,
        tableId: venuesTableName,
        token,
        primaryField: "Code",
      }),
      buildPrimaryFieldMap({
        baseId,
        tableId: roomsTableName,
        token,
        primaryField: "Name",
      }),
    ]);

    const eventUrl = new URL(
      `https://api.airtable.com/v0/${baseId}/${eventsTableName}`
    );

    const formulaParts: string[] = [
      `NOT({${FIELD_MAP.status}} = 'Cancelled')`,
      `IS_AFTER({${FIELD_MAP.start}}, '2026-07-01')`,
      `IS_BEFORE({${FIELD_MAP.start}}, '2026-07-31')`,
      `NOT(FIND('Green Room', {${FIELD_MAP.title}}))`,
    ];

    if (start && end) {
      formulaParts.push(
        `AND(
          IS_AFTER({${FIELD_MAP.start}}, '${start}'),
          IS_BEFORE({${FIELD_MAP.start}}, '${end}')
        )`
      );
    }

    eventUrl.searchParams.set(
      "filterByFormula",
      `AND(${formulaParts.join(",")})`
    );

    eventUrl.searchParams.set("sort[0][field]", FIELD_MAP.start);
    eventUrl.searchParams.set("sort[0][direction]", "asc");

    const response = await fetch(eventUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      return Response.json(
        {
          error: "Failed to fetch Airtable events",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const events = data.records
      .map((record: AirtableRecord) => {
        const fields = record.fields;

        const venueIds = asLinkedRecordIds(fields[FIELD_MAP.venue]);
        const roomIds = asLinkedRecordIds(fields[FIELD_MAP.room]);

        const venue = venueIds
          .map((id) => venueNameById[id])
          .filter(Boolean)
          .join(", ");

        const room = roomIds
          .map((id) => roomNameById[id])
          .filter(Boolean)
          .join(", ");

        const eventType = asString(fields[FIELD_MAP.eventType]);
        const colors = getEventColors(eventType);
        const status = asString(fields[FIELD_MAP.status]);
        const productionTitle = asString(fields[FIELD_MAP.title]);
        const officialTitle = asString(fields[FIELD_MAP.officialTitle]);

        const displayTitle = production
          ? productionTitle || officialTitle || "Untitled Event"
          : officialTitle || productionTitle || "Untitled Event";

        return {
          id: record.id,
          // title: asString(fields[FIELD_MAP.title]) || "Untitled Event",
          title: displayTitle,
          start: asString(fields[FIELD_MAP.start]),
          end: asString(fields[FIELD_MAP.end]) || undefined,
          resourceId: slugify(venue),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          extendedProps: {
              venue,
              room,
              status,
              eventType,
          },
        };
      })
      .filter((event) => {
        if (!venueFilter || venueFilter === "all") return true;

        return event.extendedProps.venue === venueFilter;
      });

    return Response.json(events);
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}