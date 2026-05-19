import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, MapPin, Plus, Trash2 } from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { deleteEvent, getEvent } from "@/features/events/events.api";
import {
  createActivity,
  listActivitiesByEvent,
} from "@/features/activities/activities.api";
import { activitySchema, type ActivityDTO } from "@/features/activities/activities.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/events/$eventId")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { activeOrgId, role } = useOrganisation();
  const canEdit = canManage(role);
  const canDeleteEvent = role === "org_admin" || role === "organiser";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const eventQ = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId) });
  const activitiesQ = useQuery({
    queryKey: ["activities", eventId],
    queryFn: () => listActivitiesByEvent(eventId),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      toast.success("Évènement supprimé");
      qc.invalidateQueries({ queryKey: ["events", activeOrgId] });
      navigate({ to: "/app/events" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (eventQ.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!eventQ.data) return <p className="text-sm text-destructive">Évènement introuvable</p>;
  const ev = eventQ.data;

  return (
    <div>
      <Link
        to="/app/events"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Tous les évènements
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{ev.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateRange(ev.start_date, ev.end_date)}
          </p>
          {ev.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" /> {ev.location}
            </p>
          )}
          {ev.description && <p className="text-sm mt-3 max-w-2xl">{ev.description}</p>}
        </div>
        {canDeleteEvent && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet évènement ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Toutes les activités, shifts et affectations associés seront supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => delMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Activités</h2>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Ajouter
                </Button>
              </DialogTrigger>
              <ActivityForm
                orgId={activeOrgId!}
                eventId={eventId}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["activities", eventId] });
                }}
              />
            </Dialog>
          )}
        </div>

        {activitiesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (activitiesQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center">
            <p className="text-sm">Aucune activité pour le moment.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activitiesQ.data!.map((a) => (
              <li key={a.id}>
                <Link
                  to="/app/events/$eventId/$activityId"
                  params={{ eventId, activityId: a.id }}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.location || "—"} {a.description ? ` · ${a.description}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("fr-BE", { day: "2-digit", month: "long", year: "numeric" });
  if (start === end) return fmt.format(new Date(start));
  return `${fmt.format(new Date(start))} → ${fmt.format(new Date(end))}`;
}

function ActivityForm({
  orgId,
  eventId,
  onDone,
}: {
  orgId: string;
  eventId: string;
  onDone: () => void;
}) {
  const form = useForm<ActivityDTO>({
    resolver: zodResolver(activitySchema),
    defaultValues: { name: "", description: "", location: "" },
  });
  const m = useMutation({
    mutationFn: (v: ActivityDTO) => createActivity(orgId, eventId, v),
    onSuccess: () => {
      toast.success("Activité créée");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nouvelle activité</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <Field label="Nom" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Lieu" error={form.formState.errors.location?.message}>
          <Input {...form.register("location")} />
        </Field>
        <Field label="Description" error={form.formState.errors.description?.message}>
          <Textarea rows={3} {...form.register("description")} />
        </Field>
        <DialogFooter>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
