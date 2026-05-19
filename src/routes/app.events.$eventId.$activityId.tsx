/**
 * Détail activité — gestion des shifts et des affectations.
 * Chaque shift est dépliable pour gérer ses affectations (worker + statut).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  Users as UsersIcon,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { getActivity } from "@/features/activities/activities.api";
import {
  createShift,
  deleteShift,
  listShiftsByActivity,
  type ShiftWithRole,
} from "@/features/shifts/shifts.api";
import { shiftSchema, type ShiftDTO } from "@/features/shifts/shifts.schemas";
import { listRoles } from "@/features/roles/roles.api";
import { listWorkers } from "@/features/workers/workers.api";
import {
  ASSIGNMENT_STATUS_LABELS,
  createAssignment,
  deleteAssignment,
  listAssignmentsByShift,
  updateAssignmentStatus,
  type AssignmentStatus,
} from "@/features/assignments/assignments.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Route = createFileRoute("/app/events/$eventId/$activityId")({
  component: ActivityDetailPage,
});

function ActivityDetailPage() {
  const { eventId, activityId } = Route.useParams();
  const { activeOrgId, role } = useOrganisation();
  const canEdit = canManage(role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const activityQ = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => getActivity(activityId),
  });
  const shiftsQ = useQuery({
    queryKey: ["shifts", activityId],
    queryFn: () => listShiftsByActivity(activityId),
  });
  const rolesQ = useQuery({
    queryKey: ["roles", activeOrgId],
    queryFn: () => listRoles(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const invalidateShifts = () =>
    qc.invalidateQueries({ queryKey: ["shifts", activityId] });

  if (activityQ.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!activityQ.data) return <p className="text-sm text-destructive">Activité introuvable</p>;
  const ac = activityQ.data;

  return (
    <div>
      <Link
        to="/app/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour à l'évènement
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{ac.name}</h1>
        {ac.location && (
          <p className="text-sm text-muted-foreground mt-1">{ac.location}</p>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Shifts</h2>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={(rolesQ.data?.length ?? 0) === 0}>
                  <Plus className="h-4 w-4 mr-2" /> Ajouter
                </Button>
              </DialogTrigger>
              <ShiftForm
                orgId={activeOrgId!}
                activityId={activityId}
                roles={rolesQ.data ?? []}
                onDone={() => {
                  setOpen(false);
                  invalidateShifts();
                }}
              />
            </Dialog>
          )}
        </div>

        {(rolesQ.data?.length ?? 0) === 0 && canEdit && (
          <div className="rounded-md border border-dashed bg-muted/10 p-4 mb-3 text-sm">
            Définissez d'abord vos{" "}
            <Link to="/app/roles" className="underline font-medium">
              rôles
            </Link>{" "}
            pour pouvoir créer des shifts.
          </div>
        )}

        {shiftsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (shiftsQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center">
            <p className="text-sm">Aucun shift planifié.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {shiftsQ.data!.map((s) => (
              <ShiftRow key={s.id} shift={s} canEdit={canEdit} onChanged={invalidateShifts} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ShiftRow({
  shift,
  canEdit,
  onChanged,
}: {
  shift: ShiftWithRole;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filled = shift.assignments_count;
  const ratio = filled >= shift.capacity ? "complet" : `${filled}/${shift.capacity}`;
  const isFull = filled >= shift.capacity;

  const delMutation = useMutation({
    mutationFn: () => deleteShift(shift.id),
    onSuccess: () => {
      toast.success("Shift supprimé");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <li className="rounded-lg border bg-card shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-3 p-4">
          <CollapsibleTrigger className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {shift.role?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatRange(shift.start_at, shift.end_at)}
              </p>
            </div>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs px-2 py-1 rounded-md font-medium ${
                isFull
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              <UsersIcon className="h-3 w-3 inline mr-1" />
              {ratio}
            </span>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Supprimer ce shift et ses affectations ?")) delMutation.mutate();
                }}
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <ShiftAssignments shiftId={shift.id} canEdit={canEdit} onChanged={onChanged} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function ShiftAssignments({
  shiftId,
  canEdit,
  onChanged,
}: {
  shiftId: string;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { activeOrgId } = useOrganisation();
  const qc = useQueryClient();

  const aQ = useQuery({
    queryKey: ["assignments", shiftId],
    queryFn: () => listAssignmentsByShift(shiftId),
  });
  const workersQ = useQuery({
    queryKey: ["workers", activeOrgId],
    queryFn: () => listWorkers(activeOrgId!),
    enabled: !!activeOrgId && canEdit,
  });

  const assignedIds = useMemo(
    () => new Set((aQ.data ?? []).map((a) => a.worker_id)),
    [aQ.data],
  );
  const availableWorkers = useMemo(
    () => (workersQ.data ?? []).filter((w) => !assignedIds.has(w.id)),
    [workersQ.data, assignedIds],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["assignments", shiftId] });
    onChanged();
  };

  const addMutation = useMutation({
    mutationFn: (workerId: string) => createAssignment(activeOrgId!, shiftId, workerId),
    onSuccess: () => {
      toast.success("Travailleur affecté");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssignmentStatus }) =>
      updateAssignmentStatus(id, status),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const delMutation = useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess: () => {
      toast.success("Affectation supprimée");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
      {aQ.isLoading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (aQ.data?.length ?? 0) === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun travailleur affecté.</p>
      ) : (
        <ul className="space-y-2">
          {aQ.data!.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background border p-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {a.worker
                    ? `${a.worker.first_name} ${a.worker.last_name}`
                    : "Travailleur supprimé"}
                </p>
                {a.worker?.phone && (
                  <p className="text-xs text-muted-foreground truncate">{a.worker.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit ? (
                  <Select
                    value={a.status}
                    onValueChange={(v) =>
                      statusMutation.mutate({ id: a.id, status: v as AssignmentStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ASSIGNMENT_STATUS_LABELS) as AssignmentStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ASSIGNMENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {ASSIGNMENT_STATUS_LABELS[a.status]}
                  </span>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => delMutation.mutate(a.id)}
                    aria-label="Retirer"
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <Select
            value=""
            onValueChange={(v) => v && addMutation.mutate(v)}
            disabled={addMutation.isPending}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue
                placeholder={
                  availableWorkers.length === 0 ? "Tous les workers déjà affectés" : "Affecter un travailleur…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableWorkers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

function ShiftForm({
  orgId,
  activityId,
  roles,
  onDone,
}: {
  orgId: string;
  activityId: string;
  roles: { id: string; name: string }[];
  onDone: () => void;
}) {
  const form = useForm<ShiftDTO>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { role_id: "", start_at: "", end_at: "", capacity: 1 },
  });
  const m = useMutation({
    mutationFn: (v: ShiftDTO) => createShift(orgId, activityId, v),
    onSuccess: () => {
      toast.success("Shift créé");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nouveau shift</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <Select
            value={form.watch("role_id")}
            onValueChange={(v) => form.setValue("role_id", v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un rôle" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.role_id && (
            <p className="text-xs text-destructive">{form.formState.errors.role_id.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Début</Label>
            <Input type="datetime-local" {...form.register("start_at")} />
            {form.formState.errors.start_at && (
              <p className="text-xs text-destructive">{form.formState.errors.start_at.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Fin</Label>
            <Input type="datetime-local" {...form.register("end_at")} />
            {form.formState.errors.end_at && (
              <p className="text-xs text-destructive">{form.formState.errors.end_at.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Capacité</Label>
          <Input type="number" min={1} {...form.register("capacity")} />
          {form.formState.errors.capacity && (
            <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
