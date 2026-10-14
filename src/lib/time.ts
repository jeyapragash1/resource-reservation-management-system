export const timeZone = "Asia/Colombo";
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}
export function toLocalInput(value: string) {
  return new Date(new Date(value).getTime() + 330 * 60000)
    .toISOString()
    .slice(0, 16);
}
export function fromLocalInput(value: string) {
  return new Date(`${value}:00+05:30`).toISOString();
}
export function nextSlot() {
  return toLocalInput(
    new Date(Math.ceil((Date.now() + 60000) / 1800000) * 1800000).toISOString(),
  );
}
