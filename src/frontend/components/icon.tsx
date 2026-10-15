import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  home: "m3 10 9-7 9 7v10H3V10 M9 20v-7h6v7",
  resources: "M4 4h7v7H4z M14 4h6v7h-6z M4 14h7v6H4z M14 14h6v6h-6z",
  calendar: "M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14 M9 14h2 M14 14h2 M9 17h2",
  reservations: "M6 5h12v16H6z M9 3h6v4H9z M9 12l2 2 4-4 M9 18h6",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3 M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M21 21v-3a4 4 0 0 0-3-4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  reports: "M5 3h10l4 4v14H5z M14 3v5h5 M8 17v-3 M12 17v-6 M16 17v-4",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0 M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  logout: "M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
};
export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <svg
      className="ui-icon"
      style={style}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.resources} />
    </svg>
  );
}
export function Brand({ full = false }: { full?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark">
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 25C6 16 10 6 16 6s10 10 11 19h-6c-1-7-2-12-5-12s-4 5-5 12H5Z"
            stroke="white"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="m13 23 3-6 3 6" stroke="white" strokeWidth="2" />
        </svg>
      </span>
      <span>
        {full ? "PrimeWave Lab (Pvt) Ltd" : "PrimeWave Lab"}
        {full && <small>TURNING COMPLEXITY INTO POSSIBILITY</small>}
      </span>
    </span>
  );
}
