/**
 * Planning — vue rapide des shifts non remplis sur toute l'organisation.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Users as UsersIcon, ArrowRight } from "lucide-react";
import { useOrganisation } from "@/features/organisations/organisation-context";
import { listOpenShifts } from "@/features/shifts/shifts.api";

export const Route = createFileRoute("/app/planning")({
  component: PlanningPage,
});

function PlanningPage() {
  const { activeOrgId } = useOrganisation();
  const q = useQuery({
    queryKey: ["open-shifts", activeOrgId],
    queryFn: () => listOpenShifts(activeOrgId!),
    enabled: !!activeOrgId,
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Shifts à pourvoir</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {q.data?.length ?? 0} shift{(q.data?.length ?? 0) > 1 ? "s" : ""} avec des places disponibles.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/10 p-10 text-center">
          <p className="font-medium">Tous les shifts sont complets</p>
          <p className="text-sm text-muted-foreground mt-1">
            Aucun créneau à pourvoir pour le moment.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {s.role?.name ?? "—"} <span className="text-muted-foreground">·</span>{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {s.event_name} / {s.activity_name}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> {formatRange(s.start_at, s.end_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                  <UsersIcon className="h-3 w-3 inline mr-1" />
                  {s.assignments_count}/{s.capacity}
                </span>
                <Link
                  to="/app/events/$eventId/$activityId"
                  params={{ eventId: "", activityId: s.activity_id }}
                  search={{}}
                  className="text-xs text-primary inline-flex items-center hover:underline"
                  // event id requis par le router ; on n'a pas le mapping ici, on renvoie vers activité directement
                  onClick={(e) => {
                    e.preventDefault();
                    // Fallback : navigation via location pour éviter d'avoir à charger l'event_id
                    window.location.assign(`/app/events/_/${s.activity_id}`);
                  }}
                >
                  Affecter <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRange(start: string, end: string) {
  const d = new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const t = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" });
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay ? `${d.format(s)} → ${t.format(e)}` : `${d.format(s)} → ${d.format(e)}`;
}
