import { requirePageUser } from "@/backend/lib/auth";
import { ScheduleView } from "@/frontend/components/schedule-view";
export default async function Calendar() {
  await requirePageUser();
  return <ScheduleView />;
}
