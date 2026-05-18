/**
 * CRUD travailleurs — scopé à l'organisation active.
 * RLS garantit l'isolation côté DB ; on passe quand même `organisation_id`
 * pour les inserts et les filtres explicites.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { WorkerDTO } from "./workers.schemas";

export type Worker = Database["public"]["Tables"]["workers"]["Row"];

function normalize(dto: WorkerDTO) {
  return {
    first_name: dto.first_name.trim(),
    last_name: dto.last_name.trim(),
    email: dto.email?.trim() || null,
    phone: dto.phone?.trim() || null,
    notes: dto.notes?.trim() || null,
  };
}

export async function listWorkers(organisationId: string): Promise<Worker[]> {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("last_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWorker(organisationId: string, dto: WorkerDTO): Promise<Worker> {
  const { data, error } = await supabase
    .from("workers")
    .insert({ organisation_id: organisationId, ...normalize(dto) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorker(id: string, dto: WorkerDTO): Promise<Worker> {
  const { data, error } = await supabase
    .from("workers")
    .update(normalize(dto))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorker(id: string): Promise<void> {
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) throw error;
}
