import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Plus, Trash2, UserCheck, Clock } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useOrganisation } from "@/features/organisations/organisation-context";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  createInvitation,
  deleteInvitation,
  listInvitations,
  listOrgMembers,
  removeMembership,
  updateMembershipRole,
  type AppRole,
} from "@/features/invitations/invitations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/app/members")({
  component: MembersPage,
});

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["org_admin", "organiser", "activity_manager", "worker"]),
});
type InviteDTO = z.infer<typeof inviteSchema>;

function MembersPage() {
  const { activeOrgId, role: myRole } = useOrganisation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isAdmin = myRole === "org_admin";

  const membersQ = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => listOrgMembers(activeOrgId!),
    enabled: !!activeOrgId && isAdmin,
  });
  const invitesQ = useQuery({
    queryKey: ["invitations", activeOrgId],
    queryFn: () => listInvitations(activeOrgId!),
    enabled: !!activeOrgId && isAdmin,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
    qc.invalidateQueries({ queryKey: ["invitations", activeOrgId] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole }) => updateMembershipRole(id, role),
    onSuccess: () => { toast.success("Rôle mis à jour"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMembership(id),
    onSuccess: () => { toast.success("Membre retiré"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const delInviteMutation = useMutation({
    mutationFn: (id: string) => deleteInvitation(id),
    onSuccess: () => { toast.success("Invitation supprimée"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/10 p-10 text-center">
        <p className="font-medium">Accès réservé aux admins</p>
        <p className="text-sm text-muted-foreground mt-1">
          Seul un administrateur de l'organisation peut gérer les membres.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {membersQ.data?.length ?? 0} membre{(membersQ.data?.length ?? 0) > 1 ? "s" : ""} · {invitesQ.data?.filter(i => i.status === "pending").length ?? 0} invitation{(invitesQ.data?.filter(i => i.status === "pending").length ?? 0) > 1 ? "s" : ""} en attente
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Inviter
            </Button>
          </DialogTrigger>
          <InviteForm
            orgId={activeOrgId!}
            invitedBy={user!.id}
            onDone={() => { setOpen(false); invalidate(); }}
          />
        </Dialog>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Membres actifs
        </h2>
        {membersQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (membersQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre.</p>
        ) : (
          <ul className="space-y-2">
            {membersQ.data!.map((m) => {
              const isSelf = m.user_id === user?.id;
              return (
                <li
                  key={m.membership_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center text-xs font-semibold text-primary">
                      {(m.full_name || m.email || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.full_name || m.email || "—"}</p>
                      {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        roleMutation.mutate({ id: m.membership_id, role: v as AppRole })
                      }
                      disabled={isSelf}
                    >
                      <SelectTrigger className="h-9 w-[180px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isSelf && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Retirer">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Il perdra l'accès à l'organisation. Ses affectations restent conservées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMutation.mutate(m.membership_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Retirer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Invitations
        </h2>
        {invitesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (invitesQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune invitation.</p>
        ) : (
          <ul className="space-y-2">
            {invitesQ.data!.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0 flex items-center gap-3">
                  {i.status === "pending" ? (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {i.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[i.role]} · {i.status === "pending" ? "en attente" : "acceptée"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delInviteMutation.mutate(i.id)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          L'invité rejoindra automatiquement l'organisation lors de son inscription avec cet email.
        </p>
      </section>
    </div>
  );
}

function InviteForm({
  orgId,
  invitedBy,
  onDone,
}: {
  orgId: string;
  invitedBy: string;
  onDone: () => void;
}) {
  const form = useForm<InviteDTO>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "worker" },
  });
  const m = useMutation({
    mutationFn: (v: InviteDTO) => createInvitation(orgId, v.email, v.role, invitedBy),
    onSuccess: () => { toast.success("Invitation envoyée"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Inviter un membre</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <Select
            defaultValue="worker"
            onValueChange={(v) => form.setValue("role", v as AppRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? "Envoi…" : "Inviter"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
