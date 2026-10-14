"use client";
import { useState } from "react";
import type { Reservation, Resource } from "@/lib/types";
import { api } from "@/lib/client";
import { fromLocalInput, nextSlot, toLocalInput } from "@/lib/time";
import { Dialog } from "./dialog";
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/reservations${reservation ? `/${reservation.id}` : ""}`, {
        method: reservation ? "PATCH" : "POST",
        body: JSON.stringify({
          resource_id: resourceId,
          title: form.get("title"),
          notes: form.get("notes"),
          attendees: Number(form.get("attendees")),
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
      title={reservation ? "Edit reservation" : "New reservation"}
      onClose={onClose}
    >
      <p className="muted">Choose a resource and reserve the time you need.</p>
      <form onSubmit={submit}>
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
                : "Confirm reservation"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
