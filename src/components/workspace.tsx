"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  categories,
  type Resource,
  type Reservation,
  type User,
} from "@/lib/types";
import { fromLocalInput, toLocalInput } from "@/lib/time";
import { ReservationForm } from "./reservation-form";
import { ResourceForm } from "./resource-form";
import { Dialog } from "./dialog";
import { ResourceCard } from "./resource-card";
import { ReservationTable } from "./reservation-table";
type View = "overview" | "resources" | "reservations";
type BookingPage = { items: Reservation[]; total: number; page: number };
type Overview = {
  resources: number;
  in_use: number;
  mine: number;
  today: number;
};
type Editor =
  | { kind: "booking"; selected?: string; reservation?: Reservation }
  | { kind: "resource"; resource?: Resource };
export function Workspace({
  view,
  user,
  initialResource = "",
}: {
  view: View;
  user: User;
  initialResource?: string;
}) {
  const [resources, setResources] = useState<Resource[]>([]),
    [bookings, setBookings] = useState<BookingPage>({
      items: [],
      total: 0,
      page: 1,
    });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirm, setConfirm] = useState<{
      kind: "cancel" | "archive";
      id: string;
      name: string;
    } | null>(null),
    [pending, setPending] = useState(false),
    [confirmError, setConfirmError] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [archived, setArchived] = useState(false);
  const [scope, setScope] = useState("all"),
    [status, setStatus] = useState("upcoming"),
    [resourceFilter, setResourceFilter] = useState(initialResource),
    [page, setPage] = useState(1);
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [availability, setAvailability] = useState("");
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ scope, status, page: String(page) });
    if (resourceFilter) params.set("resource", resourceFilter);
    const resourceParams = new URLSearchParams(availability);
    if (archived || view === "reservations")
      resourceParams.set("archived", "true");
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [r, b, o] = await Promise.all([
          api<Resource[]>(`/resources?${resourceParams}`),
          view !== "resources"
            ? api<BookingPage>(`/reservations?${params}`)
            : Promise.resolve(null),
          view === "overview"
            ? api<Overview>("/overview")
            : Promise.resolve(null),
        ]);
        if (active) {
          setResources(r);
          setNow(Date.now());
          if (b) setBookings(b);
          if (o) setOverview(o);
        }
      } catch (error) {
        if (active) setError((error as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    view,
    scope,
    status,
    resourceFilter,
    page,
    availability,
    archived,
    refresh,
  ]);
  function saved() {
    setEditor(null);
    setMessage("Changes saved. The shared schedule is up to date.");
    reload();
  }
  async function confirmAction() {
    if (!confirm) return;
    setPending(true);
    setConfirmError("");
    try {
      await api(
        `/${confirm.kind === "cancel" ? "reservations" : "resources"}/${confirm.id}`,
        { method: "DELETE" },
      );
      setMessage(
        confirm.kind === "cancel"
          ? "Reservation cancelled. The time slot is available again."
          : "Resource archived. Its reservation history is retained.",
      );
      setConfirm(null);
      reload();
    } catch (error) {
      setConfirmError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  function checkAvailability(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (!start || !end || end <= start)
        throw new Error("Choose an end time after the start time.");
      setAvailability(
        new URLSearchParams({
          start: fromLocalInput(start),
          end: fromLocalInput(end),
        }).toString(),
      );
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const activeResources = resources.filter((r) => !r.archived_at);
  const filtered = resources.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      `${r.name} ${r.location} ${r.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const titles = {
    overview: [
      "Your workspace, at a glance",
      "See what’s booked and plan what’s next.",
    ],
    resources: [
      "Find your next resource",
      "Rooms, workspaces, and equipment for the way your team works.",
    ],
    reservations: [
      "A clear view of the schedule",
      "Manage upcoming bookings and keep track of past activity.",
    ],
  };
  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {view === "overview"
              ? `Welcome, ${user.name.split(" ")[0]}`
              : "Organization workspace"}
          </p>
          <h1>{titles[view][0]}</h1>
          <p className="muted">{titles[view][1]}</p>
        </div>
        <div className="heading-actions">
          {view === "resources" && user.role === "admin" && (
            <button
              className="secondary"
              onClick={() => setEditor({ kind: "resource" })}
            >
              Add resource
            </button>
          )}
          <button
            onClick={() => setEditor({ kind: "booking" })}
            disabled={loading || activeResources.length === 0}
          >
            + New reservation
          </button>
        </div>
      </div>
      {message && (
        <div className="notice success" role="status">
          {message}
          <button
            className="icon-button"
            onClick={() => setMessage("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="secondary small" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {view === "overview" && (
        <>
          <div className="stats">
            {[
              ["Active resources", overview?.resources, "Ready for your team"],
              ["In use now", overview?.in_use, "Across the organization"],
              ["Reservations today", overview?.today, "Sri Lanka calendar day"],
              [
                "Your upcoming bookings",
                overview?.mine,
                "Including in-progress bookings",
              ],
            ].map(([label, value, hint]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{loading ? "—" : (value ?? "—")}</strong>
                <small>{hint}</small>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <div>
              <h2>Upcoming reservations</h2>
              <p className="muted small">
                The next bookings across your organization.
              </p>
            </div>
            <Link className="text-link" href="/reservations">
              View schedule ↗
            </Link>
          </div>
        </>
      )}
      {view === "resources" && (
        <>
          <form className="availability" onSubmit={checkAvailability}>
            <div>
              <h2>Check availability</h2>
              <p className="small muted">Find a free slot · Sri Lanka time</p>
            </div>
            <label>
              From
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              Until
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="secondary" disabled={loading}>
              Check
            </button>
            {availability && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAvailability("");
                  setStart("");
                  setEnd("");
                }}
              >
                Clear
              </button>
            )}
          </form>
          <div className="resource-toolbar">
            <label className="search-label">
              <span className="sr-only">Search resources</span>
              <input
                type="search"
                placeholder="Search name, location, or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {user.role === "admin" && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Include archived
              </label>
            )}
          </div>
          <p className="small muted">
            {filtered.length} resources ·{" "}
            {availability
              ? "Availability for the selected period"
              : "Availability right now"}
          </p>
          {loading && resources.length === 0 ? (
            <p className="empty" role="status">
              Loading resources…
            </p>
          ) : (
            <div className="resource-grid">
              {filtered.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  admin={user.role === "admin"}
                  onReserve={() =>
                    setEditor({ kind: "booking", selected: resource.id })
                  }
                  onEdit={() => setEditor({ kind: "resource", resource })}
                  onArchive={() => {
                    setConfirmError("");
                    setConfirm({
                      kind: "archive",
                      id: resource.id,
                      name: resource.name,
                    });
                  }}
                />
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty">
              <h2>No resources found</h2>
              <p>
                Try another search or category.
                {user.role === "admin" ? " You can also add a resource." : ""}
              </p>
            </div>
          )}
        </>
      )}
      {view === "reservations" && (
        <div className="filters">
          <div className="segmented" aria-label="Reservation scope">
            {[
              ["all", "All reservations"],
              ["mine", "My reservations"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={scope === value ? "selected" : ""}
                onClick={() => {
                  setScope(value);
                  setPage(1);
                }}
                aria-pressed={scope === value}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Reservation status</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All statuses</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by resource</span>
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All resources</option>
              {resources.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {view !== "resources" && (
        <>
          <div className="schedule" aria-busy={loading}>
            {loading && bookings.items.length === 0 ? (
              <p className="empty" role="status">
                Loading reservations…
              </p>
            ) : bookings.items.length === 0 ? (
              <div className="empty">
                <h2>No reservations here yet</h2>
                <p>
                  {status === "upcoming"
                    ? "Choose a resource and make your first reservation."
                    : "Try a different filter to find reservations."}
                </p>
                <Link className="text-link" href="/resources">
                  Browse resources ↗
                </Link>
              </div>
            ) : (
              <ReservationTable
                bookings={bookings.items}
                user={user}
                now={now}
                onEdit={(reservation) =>
                  setEditor({ kind: "booking", reservation })
                }
                onCancel={(reservation) => {
                  setConfirmError("");
                  setConfirm({
                    kind: "cancel",
                    id: reservation.id,
                    name: reservation.title,
                  });
                }}
              />
            )}
          </div>
          <div className="pagination">
            <span>
              {bookings.total} reservations · Times in Sri Lanka (UTC+05:30)
            </span>
            {view === "reservations" && (
              <div>
                <button
                  className="secondary"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="secondary"
                  disabled={page * 20 >= bookings.total || loading}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {editor?.kind === "booking" && (
        <ReservationForm
          resources={activeResources}
          selected={editor.selected}
          reservation={editor.reservation}
          interval={
            availability
              ? {
                  start: toLocalInput(
                    new URLSearchParams(availability).get("start")!,
                  ),
                  end: toLocalInput(
                    new URLSearchParams(availability).get("end")!,
                  ),
                }
              : undefined
          }
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {editor?.kind === "resource" && (
        <ResourceForm
          resource={editor.resource}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {confirm && (
        <Dialog
          title={
            confirm.kind === "cancel"
              ? "Cancel reservation?"
              : "Archive resource?"
          }
          onClose={() => {
            if (!pending) setConfirm(null);
          }}
        >
          <p>
            <strong>{confirm.name}</strong>
          </p>
          <p className="muted">
            {confirm.kind === "cancel"
              ? "This releases the time slot for other bookings. The reservation stays in the history."
              : "This resource will no longer accept bookings. Cancel its active and upcoming reservations first."}
          </p>
          {confirmError && (
            <p role="alert" className="notice error">
              {confirmError}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              Keep {confirm.kind === "cancel" ? "reservation" : "resource"}
            </button>
            <button
              className="danger-button"
              disabled={pending}
              onClick={confirmAction}
            >
              {pending
                ? "Saving…"
                : confirm.kind === "cancel"
                  ? "Cancel reservation"
                  : "Archive resource"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
