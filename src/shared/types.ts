export type User = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
};
export const categories = [
  "Meeting room",
  "Workspace",
  "Equipment",
  "Vehicle",
] as const;
export type Resource = {
  id: string;
  name: string;
  category: (typeof categories)[number];
  location: string;
  capacity: number;
  description: string;
  archived_at: string | null;
  available?: boolean;
  upcoming_count?: number;
};
export type Reservation = {
  id: string;
  resource_id: string;
  user_id: string;
  title: string;
  notes: string;
  starts_at: string;
  ends_at: string;
  attendees: number;
  cancelled_at: string | null;
  resource_name: string;
  resource_category: string;
  location: string;
  organizer_name: string;
};
