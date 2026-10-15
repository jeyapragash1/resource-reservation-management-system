import { Workspace } from "@/frontend/components/workspace";
import { requirePageUser } from "@/backend/lib/auth";
export default async function Resources() {
  return <Workspace view="resources" user={await requirePageUser()} />;
}
