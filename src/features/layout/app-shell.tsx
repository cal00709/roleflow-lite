import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Users, LayoutDashboard, CalendarDays, Tags, ClipboardList, UserCog } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useOrganisation } from "@/features/organisations/organisation-context";
import { OrgSwitcher } from "./org-switcher";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: false },
  { to: "/app/events", label: "Évènements", icon: CalendarDays, exact: false, adminOnly: false },
  { to: "/app/planning", label: "Planning", icon: ClipboardList, exact: false, adminOnly: false },
  { to: "/app/workers", label: "Travailleurs", icon: Users, exact: false, adminOnly: false },
  { to: "/app/roles", label: "Rôles", icon: Tags, exact: false, adminOnly: false },
  { to: "/app/members", label: "Membres", icon: UserCog, exact: false, adminOnly: true },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { activeMembership, role } = useOrganisation();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-5 border-b">
          <Link to="/app" className="block">
            <p className="text-lg font-semibold tracking-tight">RoleFlow</p>
            <p className="text-xs text-muted-foreground">Gestion des rôles</p>
          </Link>
        </div>
        <div className="px-4 py-4 border-b">
          <OrgSwitcher />
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t space-y-2">
          <div className="text-xs">
            <p className="font-medium truncate">{user?.email}</p>
            {role && <p className="text-muted-foreground capitalize">{role.replace("_", " ")}</p>}
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="w-full">
            <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
          </Button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b bg-background/90 backdrop-blur">
        <Link to="/app" className="font-semibold tracking-tight">RoleFlow</Link>
        <div className="flex items-center gap-2">
          <OrgSwitcher compact />
          <Button onClick={handleSignOut} variant="ghost" size="icon" aria-label="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="md:pl-64">
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          {activeMembership && (
            <p className="text-xs text-muted-foreground mb-4 md:hidden">
              {activeMembership.organisation.name}
            </p>
          )}
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-background grid grid-cols-5">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="flex flex-col items-center justify-center py-2 text-xs text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5 mb-0.5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="md:hidden h-14" />
    </div>
  );
}
