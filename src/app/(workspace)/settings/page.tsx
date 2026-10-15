import { requirePageUser } from "@/backend/lib/auth";
export default async function Settings() {
  const user = await requirePageUser();
  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your account and workspace preferences.</p>
        </div>
      </div>
      <section className="settings-panel">
        <h2>Account</h2>
        {[
          ["Name", user.name],
          ["Email", user.email],
          ["Role", user.role === "admin" ? "Administrator" : "Employee"],
          ["Time zone", "Asia / Colombo (UTC+05:30)"],
          ["Session", "Expires 8 hours after sign-in"],
          [
            "Booking policy",
            "Available reservations are confirmed immediately",
          ],
        ].map(([label, value]) => (
          <div className="settings-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <p className="field-hint">
          Contact your administrator to update your account. Booking times use
          the organization’s Sri Lanka time zone.
        </p>
      </section>
    </div>
  );
}
