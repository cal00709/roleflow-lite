/**
 * Contexte d'organisation active.
 * Persiste l'ID sélectionné en localStorage, expose la liste des memberships,
 * et fournit le rôle de l'utilisateur courant dans l'orga active.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { listMyMemberships, type AppRole, type MembershipWithOrg } from "./organisations.api";

const STORAGE_KEY = "roleflow.activeOrgId";

interface OrgContextValue {
  loading: boolean;
  memberships: MembershipWithOrg[];
  activeOrgId: string | null;
  activeMembership: MembershipWithOrg | null;
  role: AppRole | null;
  selectOrg: (id: string) => void;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrganisationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [memberships, setMemberships] = useState<MembershipWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );

  // Dépend de l'ID stable, pas de l'objet user (qui peut changer de référence
  // à chaque évènement Supabase et déclencher une boucle de fetch).
  const refresh = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listMyMemberships();
      setMemberships(rows);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-sélection : conserve la valeur stockée si valide, sinon prend la première.
  useEffect(() => {
    if (loading || memberships.length === 0) return;
    const stored = activeOrgId;
    const valid = stored && memberships.some((m) => m.organisation_id === stored);
    if (!valid) {
      const fallback = memberships[0].organisation_id;
      setActiveOrgId(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [loading, memberships, activeOrgId]);

  const selectOrg = useCallback((id: string) => {
    setActiveOrgId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.organisation_id === activeOrgId) ?? null,
    [memberships, activeOrgId],
  );

  const value = useMemo<OrgContextValue>(() => ({
    loading,
    memberships,
    activeOrgId,
    activeMembership,
    role: activeMembership?.role ?? null,
    selectOrg,
    refresh,
  }), [loading, memberships, activeOrgId, activeMembership, selectOrg, refresh]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganisation() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrganisation must be used inside <OrganisationProvider>");
  return ctx;
}

/** Rôles autorisés à gérer (créer/éditer) les ressources métier. */
export const MANAGER_ROLES: AppRole[] = ["org_admin", "organiser", "activity_manager"];
export function canManage(role: AppRole | null) {
  return role !== null && MANAGER_ROLES.includes(role);
}
