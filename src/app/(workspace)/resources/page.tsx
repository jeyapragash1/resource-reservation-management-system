import { Workspace } from "@/components/workspace";
import { requirePageUser } from "@/lib/auth";
export default async function Resources() {
  return <Workspace view="resources" user={await requirePageUser()} />;
}
