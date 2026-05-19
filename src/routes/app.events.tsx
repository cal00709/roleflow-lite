import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarDays, MapPin, Plus, ArrowRight } from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { createEvent, listEvents } from "@/features/events/events.api";
import { eventSchema, type EventDTO } from "@/features/events/events.schemas";
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

export const Route = createFileRoute("/app/events")({
  component: EventsPage,
});

function EventsPage() {
  const { activeOrgId, role } = useOrganisation();
  const canEdit = canManage(role) && role !== "activity_manager"; // events réservés admin/organiser
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => listEvents(activeOrgId!),
    enabled: !!activeOrgId,
  });

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Évènements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {q.data?.length ?? 0} évènement{(q.data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nouvel évènement
              </Button>
            </DialogTrigger>
            <EventForm
              orgId={activeOrgId!}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["events", activeOrgId] });
              }}
            />
          </Dialog>
        )}
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/10 p-10 text-center">
          <p className="font-medium">Aucun évènement</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canEdit ? "Créez votre premier évènement pour planifier des activités." : "Aucun évènement programmé."}
          </p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {q.data!.map((e) => (
            <li key={e.id}>
              <Link
                to="/app/events/$eventId"
                params={{ eventId: e.id }}
                className="block rounded-lg border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="mt-3 font-semibold truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateRange(e.start_date, e.end_date)}
                </p>
                {e.location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2 truncate">
                    <MapPin className="h-3 w-3" /> {e.location}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("fr-BE", { day: "2-digit", month: "short", year: "numeric" });
  if (start === end) return fmt.format(new Date(start));
  return `${fmt.format(new Date(start))} → ${fmt.format(new Date(end))}`;
}

function EventForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const form = useForm<EventDTO>({
    resolver: zodResolver(eventSchema),
    defaultValues: { name: "", description: "", start_date: "", end_date: "", location: "" },
  });
  const m = useMutation({
    mutationFn: (v: EventDTO) => createEvent(orgId, v),
    onSuccess: () => {
      toast.success("Évènement créé");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nouvel évènement</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <Field label="Nom" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" error={form.formState.errors.start_date?.message}>
            <Input type="date" {...form.register("start_date")} />
          </Field>
          <Field label="Fin" error={form.formState.errors.end_date?.message}>
            <Input type="date" {...form.register("end_date")} />
          </Field>
        </div>
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
