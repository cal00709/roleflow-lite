import { z } from "zod";

export const shiftSchema = z
  .object({
    role_id: z.string().uuid("Rôle requis"),
    start_at: z.string().min(1, "Début requis"),
    end_at: z.string().min(1, "Fin requise"),
    capacity: z.coerce.number().int().min(1, "Min 1").max(999),
  })
  .refine((v) => new Date(v.end_at) > new Date(v.start_at), {
    message: "La fin doit être après le début",
    path: ["end_at"],
  });

export type ShiftDTO = z.infer<typeof shiftSchema>;
