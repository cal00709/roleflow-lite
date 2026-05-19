/**
 * CRUD évènements — scopés à l'organisation active.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { EventDTO } from "./events.schemas";

export type Event = Database["public"]["Tables"]["events"]["Row"];

function normalize(dto: EventDTO) {
  return {
    name: dto.name.trim(),
    description: dto.description?.trim() || null,
    location: dto.location?.trim() || null,
    start_date: dto.start_date,
    end_date: dto.end_date,
  };
}

export async function listEvents(organisationId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvent(id: string): Promise<Event> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(organisationId: string, dto: EventDTO): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .insert({ organisation_id: organisationId, ...normalize(dto) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, dto: EventDTO): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .update(normalize(dto))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
