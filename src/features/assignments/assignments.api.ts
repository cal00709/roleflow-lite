/**
 * Affectations travailleurs ↔ shifts.
 * RLS garantit l'isolation. On filtre par organisation_id côté insert.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"];

export interface AssignmentWithWorker extends Assignment {
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export async function listAssignmentsByShift(shiftId: string): Promise<AssignmentWithWorker[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, worker:workers(id, first_name, last_name, email, phone)")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AssignmentWithWorker[];
}

export async function createAssignment(
  organisationId: string,
  shiftId: string,
  workerId: string,
): Promise<Assignment> {
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      organisation_id: organisationId,
      shift_id: shiftId,
      worker_id: workerId,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus,
): Promise<Assignment> {
  const { data, error } = await supabase
    .from("assignments")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  checked_in: "Présent",
};
