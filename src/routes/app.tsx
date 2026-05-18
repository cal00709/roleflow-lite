/**
 * Pathless layout route qui protège tout ce qui est sous /app.
 * - Vérifie la session
 * - Si pas d'organisation → redirige vers /onboarding
 * - Sinon affiche l'AppShell avec navigation
 */
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/auth-context";
import { useOrganisation } from "@/features/organisations/organisation-context";
import { AppShell } from "@/features/layout/app-shell";

export const Route = createFileRoute("/app")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrganisation();

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (memberships.length === 0) return <Navigate to="/onboarding" />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
