import { redirect } from "next/navigation";
import { currentUser } from "@/backend/lib/auth";
import { Shell } from "@/frontend/components/shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
