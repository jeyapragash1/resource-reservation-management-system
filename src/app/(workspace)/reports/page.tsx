import { requirePageUser } from "@/backend/lib/auth";
import { ScheduleView } from "@/frontend/components/schedule-view";
export default async function Reports() {
  await requirePageUser();
  return <ScheduleView report />;
}
