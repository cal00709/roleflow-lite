import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ShiftDTO } from "./shifts.schemas";

export type Shift = Database["public"]["Tables"]["shifts"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];

export interface ShiftWithRole extends Shift {
  role: Pick<Role, "id" | "name"> | null;
  assignments_count: number;
}

function normalize(dto: ShiftDTO) {
  return {
    role_id: dto.role_id,
    start_at: new Date(dto.start_at).toISOString(),
    end_at: new Date(dto.end_at).toISOString(),
    capacity: dto.capacity,
  };
}

/** Shifts d'une activité, avec rôle joint et nb d'affectations. */
export async function listShiftsByActivity(activityId: string): Promise<ShiftWithRole[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*, role:roles(id, name), assignments(id)")
    .eq("activity_id", activityId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s) => {
    const { assignments, ...rest } = s as Shift & {
      role: Pick<Role, "id" | "name"> | null;
      assignments: { id: string }[];
    };
    return { ...rest, assignments_count: assignments?.length ?? 0 };
  });
}

/** Shifts non remplis (capacity > assignments) sur toute l'organisation. */
export async function listOpenShifts(organisationId: string): Promise<
  (ShiftWithRole & { activity_name: string; event_name: string })[]
> {
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "*, role:roles(id, name), assignments(id), activity:activities(name, event:events(name))",
    )
    .eq("organisation_id", organisationId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((s) => {
      const row = s as Shift & {
        role: Pick<Role, "id" | "name"> | null;
        assignments: { id: string }[];
        activity: { name: string; event: { name: string } | null } | null;
      };
      return {
        ...row,
        assignments_count: row.assignments?.length ?? 0,
        activity_name: row.activity?.name ?? "—",
        event_name: row.activity?.event?.name ?? "—",
      };
    })
    .filter((s) => s.assignments_count < s.capacity);
}

export async function createShift(
  organisationId: string,
  activityId: string,
  dto: ShiftDTO,
): Promise<Shift> {
  const { data, error } = await supabase
    .from("shifts")
    .insert({
      organisation_id: organisationId,
      activity_id: activityId,
      ...normalize(dto),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateShift(id: string, dto: ShiftDTO): Promise<Shift> {
  const { data, error } = await supabase
    .from("shifts")
    .update(normalize(dto))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) throw error;
}
