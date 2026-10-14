import { Workspace } from "@/components/workspace";
import { requirePageUser } from "@/lib/auth";
export default async function Overview() {
  return <Workspace view="overview" user={await requirePageUser()} />;
}
