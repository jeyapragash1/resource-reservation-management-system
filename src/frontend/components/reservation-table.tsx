import type { Reservation, User } from "@/shared/types";
import { formatDate, formatTime } from "@/shared/time";
import { resourceImage } from "@/frontend/lib/resource-image";
export function ReservationTable({
  bookings,
  user,
  now,
  onEdit,
  onCancel,
  list = false,
}: {
  bookings: Reservation[];
  user: User;
  now: number;
  onEdit: (reservation: Reservation) => void;
  onCancel: (reservation: Reservation) => void;
  list?: boolean;
}) {
  return (
    <div className={`table-scroll ${list ? "reservation-list" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>Reservation / resource</th>
            <th>Date & time</th>
            <th>Organizer</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const start = new Date(booking.starts_at).getTime(),
              end = new Date(booking.ends_at).getTime();
            const status = booking.cancelled_at
              ? "Cancelled"
              : end <= now
                ? "Completed"
                : start <= now
                  ? "In progress"
                  : "Upcoming";
            const color =
              status === "Upcoming"
                ? "blue"
                : status === "In progress"
                  ? "amber"
                  : "neutral";
            const canManage =
              (booking.user_id === user.id || user.role === "admin") &&
              !booking.cancelled_at &&
              end > now;
            const startDate = formatDate(booking.starts_at),
              endDate = formatDate(booking.ends_at);
            return (
              <tr key={booking.id}>
                <td>
                  {list && (
                    <div
                      className="reservation-thumbnail"
                      style={{
                        backgroundImage: `url(${resourceImage({ name: booking.resource_name, resource_category: booking.resource_category })})`,
                      }}
                    />
                  )}
                  <strong>{booking.title}</strong>
                  <span>
                    {booking.resource_name} · {booking.attendees}{" "}
                    {booking.attendees === 1
                      ? "person / unit"
                      : "people / units"}
                  </span>
                  {booking.notes && (
                    <span className="booking-notes">{booking.notes}</span>
                  )}
                </td>
                <td>
                  <strong>{startDate}</strong>
                  <span>
                    {formatTime(booking.starts_at)} –{" "}
                    {endDate !== startDate ? `${endDate} ` : ""}
                    {formatTime(booking.ends_at)}
                  </span>
                </td>
                <td>
                  <strong>{booking.organizer_name}</strong>
                  <span>{booking.location}</span>
                </td>
                <td>
                  <span className={`badge ${color}`}>{status}</span>
                </td>
                <td>
                  {canManage && (
                    <div className="row-actions">
                      {start > now && (
                        <button
                          className="text-button"
                          onClick={() => onEdit(booking)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="text-button danger"
                        onClick={() => onCancel(booking)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
