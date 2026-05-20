/**
 * Invitations à rejoindre une organisation.
 * - Un org_admin crée une invitation (email + role)
 * - Lors du signup, un trigger DB crée automatiquement le membership
 * - Un utilisateur déjà connecté peut accepter via accept_invitation()
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export async function listInvitations(organisationId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyPendingInvitations(): Promise<
  (Invitation & { organisation: { name: string } | null })[]
> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*, organisation:organisations(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Invitation & { organisation: { name: string } | null })[];
}

export async function createInvitation(
  organisationId: string,
  email: string,
  role: AppRole,
  invitedBy: string,
): Promise<Invitation> {
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organisation_id: organisationId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}

export async function acceptInvitation(invitationId: string) {
  const rpc = supabase as unknown as {
    rpc: (fn: "accept_invitation", args: { _invitation_id: string }) =>
      Promise<{ data: unknown; error: Error | null }>;
  };
  const { error } = await rpc.rpc("accept_invitation", { _invitation_id: invitationId });
  if (error) throw error;
}

export interface OrgMember {
  membership_id: string;
  user_id: string;
  role: AppRole;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export async function listOrgMembers(organisationId: string): Promise<OrgMember[]> {
  const rpc = supabase as unknown as {
    rpc: (fn: "list_org_members", args: { _org_id: string }) =>
      Promise<{ data: OrgMember[] | null; error: Error | null }>;
  };
  const { data, error } = await rpc.rpc("list_org_members", { _org_id: organisationId });
  if (error) throw error;
  return data ?? [];
}

export async function updateMembershipRole(membershipId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("id", membershipId);
  if (error) throw error;
}

export async function removeMembership(membershipId: string): Promise<void> {
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) throw error;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: "Admin plateforme",
  org_admin: "Admin",
  organiser: "Organisateur",
  activity_manager: "Gestionnaire d'activité",
  worker: "Travailleur",
};

export const ASSIGNABLE_ROLES: AppRole[] = ["org_admin", "organiser", "activity_manager", "worker"];
