import { z } from "zod";

export const roleSchema = z.object({
  name: z.string().min(2, "Nom requis").max(80),
  description: z.string().max(300).optional().or(z.literal("")),
});

export type RoleDTO = z.infer<typeof roleSchema>;
