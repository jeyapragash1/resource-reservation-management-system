"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/frontend/lib/client";
import type { Reservation } from "@/shared/types";
import { formatDate, formatTime, toLocalInput } from "@/shared/time";
import { Dialog } from "./dialog";
type BookingPage = { items: Reservation[]; total: number };
export function ScheduleView({ report = false }: { report?: boolean }) {
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() =>
    toLocalInput(new Date().toISOString()).slice(0, 7),
  );
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [today] = useState(() =>
    toLocalInput(new Date().toISOString()).slice(0, 10),
  );
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const first = await api<BookingPage>(
          `/reservations?status=all&page=1&month=${month}`,
        );
        const items = [...first.items];
        for (let page = 2; (page - 1) * 20 < first.total; page++) {
          if (!active) return;
          const result = await api<BookingPage>(
            `/reservations?status=all&page=${page}&month=${month}`,
          );
          items.push(...result.items);
        }
        if (active) setBookings(items);
      } catch (error) {
        if (active) setError((error as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [refresh, month]);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const monthly = bookings.filter((b) =>
    toLocalInput(b.starts_at).startsWith(month),
  );
  const activeBookings = monthly.filter((b) => !b.cancelled_at);
  const counts = new Map<string, number>();
  for (const booking of activeBookings)
    counts.set(
      booking.resource_name,
      (counts.get(booking.resource_name) ?? 0) + 1,
    );
  const usage = [...counts].sort((a, b) => b[1] - a[1]);
  function moveMonth(delta: number) {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    setMonth(date.toISOString().slice(0, 7));
  }
  function downloadReport() {
    const cell = (value: string | number) => {
      const text = String(value);
      return `"${(/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
    };
    const rows = [
      [
        "Resource",
        "Reservation",
        "Organizer",
        "Start (Sri Lanka)",
        "End (Sri Lanka)",
        "Attendees",
        "Status",
      ],
      ...monthly.map((b) => [
        b.resource_name,
        b.title,
        b.organizer_name,
        toLocalInput(b.starts_at),
        toLocalInput(b.ends_at),
        b.attendees,
        b.cancelled_at ? "Cancelled" : "Confirmed",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reservations-${month}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <h1>{report ? "Reports" : "Calendar"}</h1>
          <p className="muted">
            {report
              ? "Resource usage and reservation activity by month."
              : "View resource reservations and availability."}
          </p>
        </div>
        <Link className="button" href="/resources">
          + New reservation
        </Link>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="secondary"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <section
        className={report ? "report-panel" : "calendar-panel"}
        aria-busy={loading}
      >
        <div className="calendar-toolbar">
          <button
            className="secondary"
            onClick={() => setMonth(today.slice(0, 7))}
          >
            Today
          </button>
          <button
            className="secondary"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            {"\u2039"}
          </button>
          <strong>{label}</strong>
          <button
            className="secondary"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            {"\u203a"}
          </button>
          {report ? (
            <button onClick={downloadReport} disabled={loading}>
              Export CSV
            </button>
          ) : (
            <span className="badge green">Month view</span>
          )}
        </div>
        {loading ? (
          <p className="empty" role="status">
            Loading schedule...
          </p>
        ) : report ? (
          <>
            <div className="stats">
              <div className="stat">
                <span>Confirmed reservations</span>
                <strong>{activeBookings.length}</strong>
                <small>Starting this month</small>
              </div>
              <div className="stat">
                <span>Cancelled reservations</span>
                <strong>{monthly.length - activeBookings.length}</strong>
                <small>Retained in history</small>
              </div>
              <div className="stat">
                <span>Resources booked</span>
                <strong>{counts.size}</strong>
                <small>Unique resources</small>
              </div>
              <div className="stat">
                <span>Reserved hours</span>
                <strong>
                  {activeBookings
                    .reduce(
                      (sum, b) =>
                        sum +
                        (new Date(b.ends_at).getTime() -
                          new Date(b.starts_at).getTime()) /
                          3600000,
                      0,
                    )
                    .toFixed(1)}
                </strong>
                <small>Full duration of these bookings</small>
              </div>
            </div>
            <h2>Bookings by resource</h2>
            {usage.length ? (
              <div className="report-bars">
                {usage.map(([name, count]) => (
                  <div className="report-bar" key={name}>
                    <span>{name}</span>
                    <div className="report-track">
                      <div
                        style={{ width: `${(count / usage[0][1]) * 100}%` }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">
                No confirmed reservations start this month.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="calendar-scroll">
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div className="calendar-weekday" key={day}>
                      {day}
                    </div>
                  ),
                )}
                {Array.from(
                  { length: Math.ceil((offset + days) / 7) * 7 },
                  (_, index) => {
                    const day = index - offset + 1;
                    const valid = day >= 1 && day <= days;
                    const date = `${month}-${String(day).padStart(2, "0")}`;
                    const entries = valid
                      ? bookings.filter(
                          (b) =>
                            !b.cancelled_at &&
                            toLocalInput(b.starts_at).slice(0, 10) <= date &&
                            toLocalInput(
                              new Date(
                                new Date(b.ends_at).getTime() - 1,
                              ).toISOString(),
                            ).slice(0, 10) >= date,
                        )
                      : [];
                    return (
                      <div
                        className={`calendar-day ${date === today ? "today" : ""}`}
                        key={index}
                      >
                        {valid && (
                          <>
                            <span>{day}</span>
                            {entries.map((b) => (
                              <button
                                key={b.id}
                                className="calendar-event"
                                onClick={() => setSelected(b)}
                              >
                                <strong>{b.title}</strong>
                                <small>
                                  {formatTime(b.starts_at)} ·{" "}
                                  {formatTime(b.ends_at)}
                                </small>
                                {b.resource_name}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
            <p className="calendar-legend">
              All resources · Sri Lanka time (UTC+05:30) · Select a booking to
              view its details.
            </p>
          </>
        )}
      </section>
      {selected && (
        <Dialog title="Reservation details" onClose={() => setSelected(null)}>
          <h2>{selected.title}</h2>
          <p className="muted">
            {selected.resource_name} · {selected.location}
          </p>
          <div className="settings-row">
            <span>Date</span>
            <strong>{formatDate(selected.starts_at)}</strong>
          </div>
          <div className="settings-row">
            <span>Time</span>
            <strong>
              {formatTime(selected.starts_at)} · {formatTime(selected.ends_at)}
            </strong>
          </div>
          <div className="settings-row">
            <span>Booked by</span>
            <strong>{selected.organizer_name}</strong>
          </div>
          <div className="settings-row">
            <span>People / units</span>
            <strong>{selected.attendees}</strong>
          </div>
          {selected.notes && <p className="booking-notes">{selected.notes}</p>}
          <div className="dialog-actions">
            <Link
              className="button"
              href={`/reservations?resource=${selected.resource_id}`}
            >
              View reservations
            </Link>
          </div>
        </Dialog>
      )}
    </div>
  );
}
