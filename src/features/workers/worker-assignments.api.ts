/**
 * Helper côté worker : récupère les affectations d'un travailleur via RPC.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkerAssignmentRow = {
  assignment_id: string;
  status: Database["public"]["Enums"]["assignment_status"];
  shift_id: string;
  start_at: string;
  end_at: string;
  role_name: string | null;
  activity_id: string;
  activity_name: string;
  event_id: string;
  event_name: string;
};

export async function listWorkerAssignments(workerId: string): Promise<WorkerAssignmentRow[]> {
  const rpc = supabase as unknown as {
    rpc: (fn: "list_worker_assignments", args: { _worker_id: string }) =>
      Promise<{ data: WorkerAssignmentRow[] | null; error: Error | null }>;
  };
  const { data, error } = await rpc.rpc("list_worker_assignments", { _worker_id: workerId });
  if (error) throw error;
  return data ?? [];
}
