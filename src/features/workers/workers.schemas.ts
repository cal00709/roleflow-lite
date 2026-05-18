import { z } from "zod";

export const workerSchema = z.object({
  first_name: z.string().min(1, "Prénom requis").max(80),
  last_name: z.string().min(1, "Nom requis").max(80),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type WorkerDTO = z.infer<typeof workerSchema>;
