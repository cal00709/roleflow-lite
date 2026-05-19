import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RoleDTO } from "./roles.schemas";

export type Role = Database["public"]["Tables"]["roles"]["Row"];

function normalize(dto: RoleDTO) {
  return {
    name: dto.name.trim(),
    description: dto.description?.trim() || null,
  };
}

export async function listRoles(organisationId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createRole(organisationId: string, dto: RoleDTO): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .insert({ organisation_id: organisationId, ...normalize(dto) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRole(id: string, dto: RoleDTO): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .update(normalize(dto))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw error;
}
