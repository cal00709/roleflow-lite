import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useOrganisation, canManage } from "@/features/organisations/organisation-context";
import { createRole, deleteRole, listRoles, updateRole, type Role } from "@/features/roles/roles.api";
import { roleSchema, type RoleDTO } from "@/features/roles/roles.schemas";
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

export const Route = createFileRoute("/app/roles")({
  component: RolesPage,
});

function RolesPage() {
  const { activeOrgId, role } = useOrganisation();
  const canEdit = role === "org_admin" || role === "organiser";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["roles", activeOrgId],
    queryFn: () => listRoles(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["roles", activeOrgId] });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success("Rôle supprimé");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rôles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catalogue des rôles utilisés pour vos shifts ({q.data?.length ?? 0}).
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" /> Nouveau rôle
              </Button>
            </DialogTrigger>
            <RoleForm
              key={editing?.id ?? "new"}
              orgId={activeOrgId!}
              role={editing}
              onDone={() => {
                setOpen(false);
                invalidate();
              }}
            />
          </Dialog>
        )}
      </header>

      {canManage(role) === false && !canEdit && (
        <p className="text-xs text-muted-foreground mb-4">
          Lecture seule — seuls admin et organisateur peuvent gérer les rôles.
        </p>
      )}

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/10 p-10 text-center">
          <p className="font-medium">Aucun rôle défini</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canEdit
              ? "Créez vos rôles (ex. Barman, Accueil, Sécurité…) avant de planifier des shifts."
              : "Aucun rôle pour l'instant."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                {r.description && (
                  <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                    aria-label="Modifier"
                  >
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
                        <AlertDialogTitle>Supprimer le rôle « {r.name} » ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est impossible si des shifts utilisent encore ce rôle.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => delMutation.mutate(r.id)}
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

function RoleForm({
  orgId,
  role,
  onDone,
}: {
  orgId: string;
  role: Role | null;
  onDone: () => void;
}) {
  const form = useForm<RoleDTO>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
    },
  });
  const m = useMutation({
    mutationFn: (v: RoleDTO) => (role ? updateRole(role.id, v) : createRole(orgId, v)),
    onSuccess: () => {
      toast.success(role ? "Rôle mis à jour" : "Rôle créé");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{role ? "Modifier le rôle" : "Nouveau rôle"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={3} {...form.register("description")} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? "Enregistrement…" : role ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
