import { requirePageUser } from "@/backend/lib/auth";
import { redirect } from "next/navigation";
import { Workspace } from "@/frontend/components/workspace";
export default async function Manage() {
  const user = await requirePageUser();
  if (user.role !== "admin") redirect("/resources");
  return <Workspace view="resources" user={user} management />;
}
