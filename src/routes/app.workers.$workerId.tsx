/**
 * Détail d'un travailleur — fiche complète + liste de ses affectations.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, StickyNote, CalendarDays, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { deleteWorker, listWorkers, updateWorker } from "@/features/workers/workers.api";
import { workerSchema, type WorkerDTO } from "@/features/workers/workers.schemas";
import { listWorkerAssignments } from "@/features/workers/worker-assignments.api";
import { ASSIGNMENT_STATUS_LABELS } from "@/features/assignments/assignments.api";
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

export const Route = createFileRoute("/app/workers/$workerId")({
  component: WorkerDetailPage,
});

function WorkerDetailPage() {
  const { workerId } = Route.useParams();
  const { activeOrgId, role } = useOrganisation();
  const canEdit = canManage(role);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // On lit depuis la liste pour réutiliser le cache
  const workersQ = useQuery({
    queryKey: ["workers", activeOrgId],
    queryFn: () => listWorkers(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const worker = workersQ.data?.find((w) => w.id === workerId) ?? null;

  const assignmentsQ = useQuery({
    queryKey: ["worker-assignments", workerId],
    queryFn: () => listWorkerAssignments(workerId),
    enabled: !!workerId,
  });

  const delMutation = useMutation({
    mutationFn: () => deleteWorker(workerId),
    onSuccess: () => {
      toast.success("Travailleur supprimé");
      qc.invalidateQueries({ queryKey: ["workers", activeOrgId] });
      navigate({ to: "/app/workers" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (workersQ.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!worker) return <p className="text-sm text-destructive">Travailleur introuvable</p>;

  return (
    <div>
      <Link
        to="/app/workers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Tous les travailleurs
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center text-lg font-semibold text-primary shrink-0">
            {worker.first_name[0]}{worker.last_name[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {worker.first_name} {worker.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {assignmentsQ.data?.length ?? 0} affectation{(assignmentsQ.data?.length ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" /> Modifier
                </Button>
              </DialogTrigger>
              <EditDialog
                worker={worker}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["workers", activeOrgId] });
                }}
              />
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce travailleur ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible et supprime aussi ses affectations.
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
          </div>
        )}
      </header>

      <section className="grid sm:grid-cols-2 gap-3 mb-8">
        <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={worker.email} />
        <InfoCard icon={<Phone className="h-4 w-4" />} label="Téléphone" value={worker.phone} />
        {worker.notes && (
          <div className="sm:col-span-2 rounded-lg border bg-card p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
              <StickyNote className="h-3 w-3" /> Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{worker.notes}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Affectations
        </h2>
        {assignmentsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (assignmentsQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center">
            <p className="text-sm">Aucune affectation pour le moment.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {assignmentsQ.data!.map((a) => (
              <li key={a.assignment_id}>
                <Link
                  to="/app/events/$eventId/$activityId"
                  params={{ eventId: a.event_id, activityId: a.activity_id }}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {a.event_name} <span className="text-muted-foreground">·</span> {a.activity_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.role_name ?? "—"} · {formatRange(a.start_at, a.end_at)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md font-medium shrink-0 ${statusColor(a.status)}`}>
                    {ASSIGNMENT_STATUS_LABELS[a.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {icon} {label}
      </p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "checked_in":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

function formatRange(start: string, end: string) {
  const fmtDate = new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const fmtTime = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" });
  const s = new Date(start);
  const e = new Date(end);
  return `${fmtDate.format(s)} ${fmtTime.format(s)}–${fmtTime.format(e)}`;
}

function EditDialog({
  worker,
  onDone,
}: {
  worker: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; notes: string | null };
  onDone: () => void;
}) {
  const form = useForm<WorkerDTO>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      first_name: worker.first_name,
      last_name: worker.last_name,
      email: worker.email ?? "",
      phone: worker.phone ?? "",
      notes: worker.notes ?? "",
    },
  });
  const m = useMutation({
    mutationFn: (v: WorkerDTO) => updateWorker(worker.id, v),
    onSuccess: () => { toast.success("Travailleur mis à jour"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Modifier le travailleur</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Prénom</Label>
            <Input {...form.register("first_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input {...form.register("last_name")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} {...form.register("notes")} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
