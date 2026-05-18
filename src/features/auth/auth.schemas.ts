import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
});
export type SignInDTO = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  full_name: z.string().min(2, "Nom requis").max(120),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});
export type SignUpDTO = z.infer<typeof signUpSchema>;
