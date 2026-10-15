import { Workspace } from "@/frontend/components/workspace";
import { requirePageUser } from "@/backend/lib/auth";
export default async function Overview() {
  return <Workspace view="overview" user={await requirePageUser()} />;
}
