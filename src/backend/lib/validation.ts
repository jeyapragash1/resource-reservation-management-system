import { z } from "zod";
import { categories } from "../../shared/types";
export const idSchema = z.uuid();
const text = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max);
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(256),
});
export const resourceSchema = z.object({
  name: text(100),
  category: z.enum(categories),
  location: text(160),
  capacity: z.number().int().min(1).max(1000),
  description: z.string().trim().max(1000).default(""),
});
export const reservationSchema = z
  .object({
    resource_id: idSchema,
    title: text(160),
    notes: z.string().trim().max(1000).default(""),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    attendees: z.number().int().min(1).max(1000),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.starts_at).getTime(),
      end = new Date(value.ends_at).getTime();
    if (end <= start)
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "End time must be after start time.",
      });
    if (end - start > 7 * 86400000)
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "Reservations may last up to seven days.",
      });
  });
export function requireFuture(startsAt: string, now = Date.now()) {
  if (new Date(startsAt).getTime() <= now)
    throw new Error("Start time must be in the future.");
}
export const availabilitySchema = z
  .object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), {
    message: "End time must be after start time.",
  });
