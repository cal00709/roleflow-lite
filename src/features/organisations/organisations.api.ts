/**
 * Accès aux organisations (multi-tenant).
 * Une organisation est créée par un utilisateur connecté ; il devient
 * automatiquement `org_admin` via une seconde insertion côté memberships.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
export type Membership = Database["public"]["Tables"]["memberships"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export interface MembershipWithOrg extends Membership {
  organisation: Organisation;
}

export async function listMyMemberships(): Promise<MembershipWithOrg[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("*, organisation:organisations(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MembershipWithOrg[];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "org";
}

export async function createOrganisation(name: string): Promise<Organisation> {
  // slug unique : on suffixe avec un timestamp court si conflit
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const rpcClient = supabase as unknown as {
    rpc: (
      fn: "create_organisation_with_owner",
      args: { _name: string; _slug: string },
    ) => Promise<{ data: Organisation | null; error: Error | null }>;
  };
  const { data: org, error } = await rpcClient.rpc("create_organisation_with_owner", {
    _name: name,
    _slug: slug,
  });
  if (error) throw error;
  if (!org) throw new Error("Organisation non créée");

  return org;
}
