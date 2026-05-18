import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import {
  createWorker,
  deleteWorker,
  listWorkers,
  updateWorker,
  type Worker,
} from "@/features/workers/workers.api";
import { workerSchema, type WorkerDTO } from "@/features/workers/workers.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export const Route = createFileRoute("/app/workers")({
  component: WorkersPage,
});

function WorkersPage() {
  const { activeOrgId, role } = useOrganisation();
  const canEdit = canManage(role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);

  const workersQuery = useQuery({
    queryKey: ["workers", activeOrgId],
    queryFn: () => listWorkers(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const filtered = useMemo(() => {
    const list = workersQuery.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((w) =>
      `${w.first_name} ${w.last_name} ${w.email ?? ""} ${w.phone ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [workersQuery.data, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workers", activeOrgId] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorker(id),
    onSuccess: () => { toast.success("Travailleur supprimé"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (w: Worker) => { setEditing(w); setOpen(true); };

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Travailleurs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {workersQuery.data?.length ?? 0} travailleur{(workersQuery.data?.length ?? 0) > 1 ? "s" : ""} enregistré{(workersQuery.data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </DialogTrigger>
            <WorkerFormDialog
              key={editing?.id ?? "new"}
              worker={editing}
              orgId={activeOrgId!}
              onDone={() => { setOpen(false); invalidate(); }}
            />
          </Dialog>
        )}
      </header>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email, téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {workersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/10 p-10 text-center">
          <p className="font-medium">Aucun travailleur</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canEdit ? "Ajoutez votre premier travailleur pour démarrer." : "Aucune fiche pour le moment."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {w.first_name} {w.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[w.email, w.phone].filter(Boolean).join(" · ") || "Aucun contact"}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce travailleur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {w.first_name} {w.last_name} sera retiré définitivement. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(w.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkerFormDialog({
  worker,
  orgId,
  onDone,
}: {
  worker: Worker | null;
  orgId: string;
  onDone: () => void;
}) {
  const form = useForm<WorkerDTO>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      first_name: worker?.first_name ?? "",
      last_name: worker?.last_name ?? "",
      email: worker?.email ?? "",
      phone: worker?.phone ?? "",
      notes: worker?.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: WorkerDTO) =>
      worker ? updateWorker(worker.id, values) : createWorker(orgId, values),
    onSuccess: () => {
      toast.success(worker ? "Travailleur mis à jour" : "Travailleur créé");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{worker ? "Modifier le travailleur" : "Nouveau travailleur"}</DialogTitle>
        <DialogDescription>
          Renseignez les informations principales. Vous pourrez compléter plus tard.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={form.formState.errors.first_name?.message}>
            <Input {...form.register("first_name")} />
          </Field>
          <Field label="Nom" error={form.formState.errors.last_name?.message}>
            <Input {...form.register("last_name")} />
          </Field>
        </div>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" {...form.register("email")} />
        </Field>
        <Field label="Téléphone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </Field>
        <Field label="Notes" error={form.formState.errors.notes?.message}>
          <Textarea rows={3} {...form.register("notes")} />
        </Field>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : worker ? "Enregistrer" : "Créer"}
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
