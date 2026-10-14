import { Workspace } from "@/components/workspace";
import { requirePageUser } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
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
