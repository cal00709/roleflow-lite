/**
 * Wrappers fins autour de Supabase Auth + Lovable OAuth broker.
 * Garde les routes/composants découplés du SDK direct.
 */
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { SignInDTO, SignUpDTO } from "./auth.schemas";

export async function signIn({ email, password }: SignInDTO) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp({ email, password, full_name }: SignUpDTO) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { full_name },
    },
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw result.error;
  return result;
}
