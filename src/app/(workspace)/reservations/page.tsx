import { Workspace } from "@/frontend/components/workspace";
import { requirePageUser } from "@/backend/lib/auth";
import { idSchema } from "@/backend/lib/validation";
export default async function Reservations({
  searchParams,
}: {
  searchParams: Promise<{ resource?: string }>;
}) {
  const { resource } = await searchParams;
  return (
    <Workspace
      view="reservations"
      user={await requirePageUser()}
      initialResource={idSchema.safeParse(resource).success ? resource : ""}
    />
  );
}
