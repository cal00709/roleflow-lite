import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrganisation } from "@/features/organisations/organisation-context";
import { Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { activeMembership, role } = useOrganisation();
  if (!activeMembership) return null;

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

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/app/workers"
          className="group rounded-lg border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <Users className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="mt-4 font-semibold">Travailleurs</p>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les profils, contacts et notes de vos travailleurs.
          </p>
        </Link>

        <div className="rounded-lg border border-dashed bg-muted/20 p-5">
          <p className="font-medium text-sm">Évènements & shifts</p>
          <p className="text-xs text-muted-foreground mt-1">Bientôt disponible.</p>
        </div>
        <div className="rounded-lg border border-dashed bg-muted/20 p-5">
          <p className="font-medium text-sm">Affectations</p>
          <p className="text-xs text-muted-foreground mt-1">Bientôt disponible.</p>
        </div>
      </section>
    </div>
  );
}
