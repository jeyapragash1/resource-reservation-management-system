"use client";
import { useState } from "react";
import type { Reservation, Resource } from "@/shared/types";
import { api } from "@/frontend/lib/client";
import {
  fromLocalInput,
  nextSlot,
  toLocalInput,
  formatDate,
  formatTime,
} from "@/shared/time";
import { Dialog } from "./dialog";
import { resourceImage } from "@/frontend/lib/resource-image";
import { Icon } from "./icon";
export function ReservationForm({
  resources,
  selected,
  reservation,
  interval,
  onClose,
  onSaved,
}: {
  resources: Resource[];
  selected?: string;
  reservation?: Reservation;
  interval?: { start: string; end: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [resourceId, setResourceId] = useState(
    reservation?.resource_id ?? selected ?? resources[0]?.id ?? "",
  );
  const [start, setStart] = useState(
    reservation
      ? toLocalInput(reservation.starts_at)
      : (interval?.start ?? nextSlot()),
  );
  const [end, setEnd] = useState(
    reservation
      ? toLocalInput(reservation.ends_at)
      : (interval?.end ??
          toLocalInput(
            new Date(
              new Date(fromLocalInput(start)).getTime() + 3600000,
            ).toISOString(),
          )),
  );
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const resource = resources.find((r) => r.id === resourceId);
  const [review, setReview] = useState<{
    title: string;
    notes: string;
    attendees: number;
  } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const details = review ?? {
      title: String(form.get("title") ?? ""),
      notes: String(form.get("notes") ?? ""),
      attendees: Number(form.get("attendees")),
    };
    if (!reservation && !review) {
      if (end <= start) {
        setError("Choose an end time after the start time.");
        return;
      }
      setReview(details);
      return;
    }
    setPending(true);
    try {
      await api(`/reservations${reservation ? `/${reservation.id}` : ""}`, {
        method: reservation ? "PATCH" : "POST",
        body: JSON.stringify({
          resource_id: resourceId,
          ...details,
          starts_at: fromLocalInput(start),
          ends_at: fromLocalInput(end),
        }),
      });
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      title={
        reservation
          ? "Edit reservation"
          : review
            ? "Confirm Reservation"
            : "Book this resource"
      }
      onClose={onClose}
    >
      <p className="muted">
        {review
          ? "Review your booking details and confirm."
          : "Choose a resource and reserve the time you need."}
      </p>
      <div className="booking-layout">
        <aside className="booking-aside">
          {resource && (
            <>
              <div
                className="booking-photo"
                style={{ backgroundImage: `url(${resourceImage(resource)})` }}
              />
              <h2>{resource.name}</h2>
              <span className="badge green">{resource.category}</span>
              <p className="booking-fact">
                <Icon name="users" />
                Capacity: {resource.capacity} people / units
              </p>
              <p className="booking-fact">
                <Icon name="pin" />
                {resource.location}
              </p>
              <p>{resource.description}</p>
              <div className="booking-summary">
                <strong>Instant confirmation</strong>Available bookings are
                confirmed immediately. The shared schedule prevents overlapping
                reservations.
              </div>
            </>
          )}
        </aside>
        {review && (
          <form onSubmit={submit}>
            <div className="settings-row">
              <span>Purpose</span>
              <strong>{review.title}</strong>
            </div>
            <div className="settings-row">
              <span>Date</span>
              <strong>
                {formatDate(fromLocalInput(start))}
                {start.slice(0, 10) !== end.slice(0, 10) &&
                  ` – ${formatDate(fromLocalInput(end))}`}
              </strong>
            </div>
            <div className="settings-row">
              <span>Time</span>
              <strong>
                {formatTime(fromLocalInput(start))} –{" "}
                {formatTime(fromLocalInput(end))}
              </strong>
            </div>
            <div className="settings-row">
              <span>People / units</span>
              <strong>{review.attendees}</strong>
            </div>
            {review.notes && (
              <div className="settings-row">
                <span>Notes</span>
                <strong className="booking-notes">{review.notes}</strong>
              </div>
            )}
            <div className="booking-summary">
              This reservation will be confirmed immediately if the time slot is
              still available.
            </div>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                disabled={pending}
                onClick={() => {
                  setReview(null);
                  setError("");
                }}
              >
                Back
              </button>
              <button type="submit" disabled={pending}>
                {pending ? "Confirming…" : "Confirm reservation"}
              </button>
            </div>
          </form>
        )}
        <form
          onSubmit={submit}
          style={{ display: review ? "none" : undefined }}
        >
          <label>
            Resource
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a resource
              </option>
              {resources
                .filter((r) => !r.archived_at)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · capacity {r.capacity}
                  </option>
                ))}
            </select>
          </label>
          {resource && (
            <p className="field-hint">
              {resource.location} · {resource.description}
            </p>
          )}
          <label>
            Reservation title
            <input
              name="title"
              defaultValue={reservation?.title}
              placeholder="e.g. Product planning session"
              required
              maxLength={160}
            />
          </label>
          <div className="form-grid">
            <label>
              Start time
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              End time
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </label>
          </div>
          <p className="field-hint">
            Sri Lanka time (UTC+05:30). Maximum duration: 7 days.
          </p>
          <label>
            People / units
            <input
              name="attendees"
              type="number"
              min={1}
              max={resource?.capacity ?? 1000}
              defaultValue={reservation?.attendees ?? 1}
              required
            />
          </label>
          <label>
            Notes <span className="muted">(optional)</span>
            <textarea
              name="notes"
              defaultValue={reservation?.notes}
              rows={3}
              maxLength={1000}
              placeholder="Anything the team needs to know"
            />
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={pending}
            >
              Close
            </button>
            <button type="submit" disabled={pending || !resourceId}>
              {pending
                ? "Saving…"
                : reservation
                  ? "Save changes"
                  : "Review reservation"}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
