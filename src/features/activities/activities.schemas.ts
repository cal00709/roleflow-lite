import { z } from "zod";

export const activitySchema = z.object({
  name: z.string().min(2, "Nom requis").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
});

export type ActivityDTO = z.infer<typeof activitySchema>;
