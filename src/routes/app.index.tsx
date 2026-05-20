/**
 * Dashboard — vue d'ensemble de l'organisation active.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CalendarDays,
  ClipboardList,
  Tags,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { listEvents } from "@/features/events/events.api";
import { listWorkers } from "@/features/workers/workers.api";
import { listRoles } from "@/features/roles/roles.api";
import { listOpenShifts } from "@/features/shifts/shifts.api";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { activeMembership, activeOrgId, role } = useOrganisation();

  const eventsQ = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => listEvents(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const workersQ = useQuery({
    queryKey: ["workers", activeOrgId],
    queryFn: () => listWorkers(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const rolesQ = useQuery({
    queryKey: ["roles", activeOrgId],
    queryFn: () => listRoles(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const openShiftsQ = useQuery({
    queryKey: ["open-shifts", activeOrgId],
    queryFn: () => listOpenShifts(activeOrgId!),
    enabled: !!activeOrgId,
  });

  if (!activeMembership) return null;

  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = (eventsQ.data ?? []).filter((e) => e.end_date >= today).slice(0, 5);
  const openShifts = openShiftsQ.data ?? [];
  const totalOpenSlots = openShifts.reduce((sum, s) => sum + (s.capacity - s.assignments_count), 0);

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Organisation</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
          {activeMembership.organisation.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connecté en tant que <span className="capitalize">{role?.replace("_", " ")}</span>
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Évènements à venir"
          value={upcomingEvents.length}
          icon={<CalendarDays className="h-4 w-4" />}
          to="/app/events"
        />
        <StatCard
          label="Travailleurs"
          value={workersQ.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
          to="/app/workers"
        />
        <StatCard
          label="Rôles"
          value={rolesQ.data?.length ?? 0}
          icon={<Tags className="h-4 w-4" />}
          to="/app/roles"
        />
        <StatCard
          label="Postes à pourvoir"
          value={totalOpenSlots}
          icon={<AlertTriangle className="h-4 w-4" />}
          to="/app/planning"
          highlight={totalOpenSlots > 0}
        />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Prochains évènements
            </h2>
            <Link to="/app/events" className="text-xs text-muted-foreground hover:text-foreground">
              Voir tout
            </Link>
          </div>
          {eventsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun évènement à venir.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/app/events/$eventId"
                    params={{ eventId: e.id }}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 hover:border-primary/40 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(e.start_date)}
                        {e.start_date !== e.end_date && ` → ${formatDate(e.end_date)}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Shifts à remplir
            </h2>
            <Link to="/app/planning" className="text-xs text-muted-foreground hover:text-foreground">
              Voir tout
            </Link>
          </div>
          {openShiftsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : openShifts.length === 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Tous les shifts sont complets 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {openShifts.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link
                    to="/app/events/$eventId/$activityId"
                    params={{ eventId: s.event_id, activityId: s.activity_id }}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">
                        {s.role?.name ?? "—"}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {s.activity_name}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.event_name} · {formatDateTime(s.start_at)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">
                      {s.assignments_count}/{s.capacity}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {canManage(role) && openShifts.length > 5 && (
            <p className="text-xs text-muted-foreground mt-3">
              +{openShifts.length - 5} autres shifts à remplir
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  to,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  to: "/app/events" | "/app/workers" | "/app/roles" | "/app/planning";
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-lg border p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all ${
        highlight ? "bg-amber-500/5 border-amber-500/30" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        {icon}
      </div>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Link>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
