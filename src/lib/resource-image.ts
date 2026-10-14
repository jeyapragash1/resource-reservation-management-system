export function resourceImage(resource: { name: string; category?: string; resource_category?: string }) {
  const category = resource.category ?? resource.resource_category;
  if (category === "Equipment") return "/images/laptop.jpg";
  if (category === "Vehicle") return "/images/vehicle.jpg";
  if (category === "Workspace") return "/images/workspace.jpg";
  return /conference|board| B$/i.test(resource.name) ? "/images/conference-room.jpg" : "/images/meeting-room.jpg";
}
