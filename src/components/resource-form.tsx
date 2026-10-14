"use client";
import { useState } from "react";
import { categories, type Resource } from "@/lib/types";
import { api } from "@/lib/client";
import { Dialog } from "./dialog";
export function ResourceForm({
  resource,
  onClose,
  onSaved,
}: {
  resource?: Resource;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/resources${resource ? `/${resource.id}` : ""}`, {
        method: resource ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.get("name"),
          category: form.get("category"),
          location: form.get("location"),
          capacity: Number(form.get("capacity")),
          description: form.get("description"),
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
      title={resource ? "Edit resource" : "Add resource"}
      onClose={onClose}
    >
      <p className="muted">
        Give your team the details they need to book confidently.
      </p>
      <form onSubmit={submit}>
        <label>
          Resource name
          <input
            name="name"
            defaultValue={resource?.name}
            maxLength={100}
            required
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              name="category"
              defaultValue={resource?.category ?? categories[0]}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Capacity
            <input
              name="capacity"
              type="number"
              defaultValue={resource?.capacity ?? 1}
              min={1}
              max={1000}
              required
            />
          </label>
        </div>
        <label>
          Location
          <input
            name="location"
            defaultValue={resource?.location}
            maxLength={160}
            required
          />
        </label>
        <label>
          Description <span className="muted">(optional)</span>
          <textarea
            name="description"
            defaultValue={resource?.description}
            maxLength={1000}
            rows={3}
          />
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={pending}
          >
            Close
          </button>
          <button disabled={pending} type="submit">
            {pending ? "Saving…" : resource ? "Save resource" : "Add resource"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
