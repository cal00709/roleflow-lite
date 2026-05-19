import { z } from "zod";

export const eventSchema = z
  .object({
    name: z.string().min(2, "Nom requis").max(120),
    description: z.string().max(500).optional().or(z.literal("")),
    start_date: z.string().min(1, "Date de début requise"),
    end_date: z.string().min(1, "Date de fin requise"),
    location: z.string().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "La fin doit être après le début",
    path: ["end_date"],
  });

export type EventDTO = z.infer<typeof eventSchema>;
