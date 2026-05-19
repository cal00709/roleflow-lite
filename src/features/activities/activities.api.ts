import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ActivityDTO } from "./activities.schemas";

export type Activity = Database["public"]["Tables"]["activities"]["Row"];

function normalize(dto: ActivityDTO) {
  return {
    name: dto.name.trim(),
    description: dto.description?.trim() || null,
    location: dto.location?.trim() || null,
  };
}

export async function listActivitiesByEvent(eventId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getActivity(id: string): Promise<Activity> {
  const { data, error } = await supabase.from("activities").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createActivity(
  organisationId: string,
  eventId: string,
  dto: ActivityDTO,
): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .insert({ organisation_id: organisationId, event_id: eventId, ...normalize(dto) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivity(id: string, dto: ActivityDTO): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .update(normalize(dto))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}
