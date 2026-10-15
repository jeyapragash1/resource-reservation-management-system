import Link from "next/link";
import type { Resource } from "@/shared/types";
import { resourceImage } from "@/frontend/lib/resource-image";
import { Icon } from "./icon";
export function ResourceCard({
  resource,
  admin,
  onReserve,
  onEdit,
  onArchive,
}: {
  resource: Resource;
  admin: boolean;
  onReserve: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const status = resource.archived_at
    ? "Archived"
    : resource.available
      ? "Available"
      : "Reserved";
  const color = resource.archived_at
    ? "neutral"
    : resource.available
      ? "green"
      : "amber";
  return (
    <article
      className={`resource-card ${resource.archived_at ? "archived" : ""}`}
    >
      <div
        className="resource-photo"
        style={{ backgroundImage: `url(${resourceImage(resource)})` }}
        role="img"
        aria-label={`${resource.category} example photograph`}
      />
      <div className="resource-top">
        <span className={`badge ${color}`}>{status}</span>
      </div>
      <p className="eyebrow">{resource.category}</p>
      <h2>{resource.name}</h2>
      <p className="location">
        <Icon name="pin" />
        {resource.location}
      </p>
      <p className="resource-description">
        {resource.description || "No additional details."}
      </p>
      <div className="resource-meta">
        <span>
          Capacity <strong>{resource.capacity}</strong>
        </span>
        <span>{resource.upcoming_count} upcoming</span>
      </div>
      <div className="resource-actions">
        {!resource.archived_at && (
          <button className="secondary" onClick={onReserve}>
            Reserve
          </button>
        )}
        <Link
          className="text-link"
          href={`/reservations?resource=${resource.id}`}
        >
          Schedule
        </Link>
        {admin && !resource.archived_at && (
          <>
            <button className="text-button" onClick={onEdit}>
              Edit
            </button>
            <button className="text-button danger" onClick={onArchive}>
              Archive
            </button>
          </>
        )}
      </div>
    </article>
  );
}
