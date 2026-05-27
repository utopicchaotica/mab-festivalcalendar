"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type FullCalendarType from "@fullcalendar/react";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

const resources = [
  { id: "cdcc", title: "CDCC" },
  { id: "stb", title: "STB" },
  { id: "fbc", title: "FBC" },
  { id: "stm", title: "STM" },
];

import type { CalendarApi } from "@fullcalendar/core";

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatEventTime(date: Date | null): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatEventTimeRange(start: Date | null, end: Date | null): string {
  const startTime = formatEventTime(start);

  if (!startTime) return "";

  const endTime = formatEventTime(end);

  if (!endTime) return startTime;

  return `${startTime} – ${endTime}`;
}

export default function SchedulePage() {
  const [venue, setVenue] = useState("all");
  const [currentView, setCurrentView] = useState("resourceTimeGridWeek");
  const [calendarTitle, setCalendarTitle] = useState("");
  const calendarRef = useRef<FullCalendarType | null>(null);
  const isAllVenuesView = venue === "all";
  const scheduleSubtitle = isAllVenuesView
    ? "All Venues"
    : `${venue}`;
  const [production, setProduction] = useState(false);
  
  // go to previous/next/today and change view functions
  function goToPrevious() {
    calendarRef.current?.getApi().prev();
  }
  function goToNext() {
    calendarRef.current?.getApi().next();
  }
  function goToToday() {
    calendarRef.current?.getApi().today();
  }
  function changeView(viewName: string) {
    calendarRef.current?.getApi().changeView(viewName);
    setCurrentView(viewName);
  }

  return (
    <main className="p-6">
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Venue Selector */}
        <div className="flex items-center gap-3 justify-self-start">
          <label htmlFor="venue">Venue</label>

          <select
            id="venue"
            value={venue}
            onChange={(event) => {
              setVenue(event.target.value);

              window.requestAnimationFrame(() => {
                calendarRef.current?.getApi().refetchEvents();
              });
            }}
            className="rounded border px-3 py-2"
          >
            <option value="all">All venues</option>
            <option value="CDCC">CDCC</option>
            <option value="STB">STB</option>
            <option value="FBC">FBC</option>
            <option value="STM">STM</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={production}
              onChange={(event) => {
                setProduction(event.target.checked);

                window.requestAnimationFrame(() => {
                  calendarRef.current?.getApi().refetchEvents();
                });
              }}
            />
            <span>Production</span>
          </label>
        </div>

        {/* Schedule Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold">Festival Schedule ({scheduleSubtitle})</h1>
          <p className="mt-1 text-lg font-medium text-gray-600 dark:text-[#b1aaa0]">{calendarTitle}</p>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-2 fc">
          <div className="flex flex-row items-end gap-2 fc-toolbar-chunk">
            <div className="flex items-center fc-button-group">
              <button
                type="button"
                title="Previous"
                onClick={goToPrevious}
                className="fc-prev-button fc-button fc-button-primary"
              >
                <span className="fc-icon fc-icon-chevron-left" role="img"></span>
              </button>
              <button
                type="button"
                title="Next"
                onClick={goToNext}
                className="fc-next-button fc-button fc-button-primary"
              >
                <span className="fc-icon fc-icon-chevron-right" role="img"></span>
              </button>
            </div>
            <button
              type="button"
              title="Today"
              onClick={goToToday}
              className="fc-today-button fc-button fc-button-primary"
            >
              today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="fc-button-group">
              <button
                type="button"
                onClick={() => changeView("resourceTimeGridWeek")}
                className={`fc-resourceTimeGridWeek-button fc-button fc-button-primary ${
                  currentView === "resourceTimeGridWeek" ? "bg-black text-white" : ""
                }`}
              >
                week
              </button>

              <button
                type="button"
                onClick={() => changeView("resourceTimeGridDay")}
                className={`fc-resourceTimeGridDay-button fc-button fc-button-primary ${
                  currentView === "resourceTimeGridDay" ? "bg-black text-white" : ""
                }`}
              >
                day
              </button>

              <button
                type="button"
                onClick={() => changeView("listWeek")}
                className={`fc-listWeek-button fc-button fc-button-primary ${
                  currentView === "listWeek" ? "bg-black text-white" : ""
                }`}
              >
                list
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-scroll">
        <div className={isAllVenuesView ? "min-w-[2800px]" : "min-w-[1200px]"}>
          <FullCalendar
            // key={venue}
            ref={calendarRef}
            plugins={[
              resourceTimeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            initialView="resourceTimeGridWeek"
            initialDate="2026-06-28"
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            resources={resources}
            resourceOrder={[]}
            filterResourcesWithEvents={true}
            datesAboveResources={true}
            allDaySlot={false}
            slotEventOverlap={false}
            eventMaxStack={isAllVenuesView ? 2 : 4}
            datesSet={(dateInfo) => {
              setCalendarTitle(dateInfo.view.title);
            }}
            eventClassNames={() => [
              // "overflow-hidden",
              "rounded-md",
              "text-xs",
              "festival-event",
            ]}
            headerToolbar={{
              // left: "prev,next today",
              left: "",
              center: "",
              // right: "resourceTimeGridWeek,resourceTimeGridDay,listWeek",
              right: "",
            }}
            height="auto"
            nowIndicator={true}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            defaultTimedEventDuration="01:00:00"
            events={async (fetchInfo, successCallback, failureCallback) => {
              try {
                const params = new URLSearchParams({
                  start: fetchInfo.startStr,
                  end: fetchInfo.endStr,
                  venue,
                  production: String(production),
                });

                const response = await fetch(`/api/events?${params.toString()}`);

                // if (!response.ok) {
                //   throw new Error("Could not load events");
                // }
                // if (!response.ok) {
                //     const errorText = await response.text();
                //     console.error("API error:", response.status, errorText);
                //     throw new Error(errorText);
                // }
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

                const events = await response.json();

                if (!Array.isArray(events)) {
                console.error("Expected event array, got:", events);
                failureCallback(new Error("API did not return an event array"));
                return;
                }

                successCallback(events);
              } catch (error) {
                console.error("FullCalendar event loading error:", error);

                failureCallback(
                  error instanceof Error
                    ? error
                    : new Error(String(error))
                );
              }
            }}
            eventContent={(eventInfo) => {
              const { room, venue, status, eventType } =
                eventInfo.event.extendedProps;

              const timeRange = formatEventTimeRange(
                eventInfo.event.start,
                eventInfo.event.end
              );

              return (
                <div className="leading-tight">
                  <strong>{eventInfo.event.title}</strong>

                  {/* Event time */}
                  {timeRange && (
                    <div className="festival-event-time">
                      {timeRange}
                    </div>
                  )}

                  {/* {room && <div className="text-xs">{room}</div>} */}
                  {/* {room && <div className="festival-event-meta">{room}</div>} */}

                  {/* {eventType && (
                    <div className="text-xs opacity-80">{eventType}</div>
                  )} */}
                  {/* {eventType && (
                    <div className="festival-event-meta">{eventType}</div>
                  )} */}

                  {/* {!room && venue && <div className="text-xs">{venue}</div>} */}
                  {/* {!room && venue && (
                    <div className="festival-event-meta">{venue}</div>
                  )} */}
                </div>
              );
            }}
          />
        </div>
      </div>
    </main>
  );
}