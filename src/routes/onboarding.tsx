/**
 * Onboarding — créer la première organisation après inscription.
 */
import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useOrganisation } from "@/features/organisations/organisation-context";
import { createOrganisation } from "@/features/organisations/organisations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const schema = z.object({ name: z.string().min(2, "Nom requis").max(80) });
type DTO = z.infer<typeof schema>;

function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { memberships, loading: orgLoading, refresh, selectOrg } = useOrganisation();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DTO>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

  if (loading || orgLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!user) return <Navigate to="/login" />;
  if (memberships.length > 0) return <Navigate to="/app" />;

  const onSubmit = async ({ name }: DTO) => {
    setSubmitting(true);
    try {
      const org = await createOrganisation(name);
      await refresh();
      selectOrg(org.id);
      toast.success("Organisation créée");
      router.navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">Bienvenue sur RoleFlow</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            Créez votre organisation
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            C'est le conteneur de tous vos évènements, activités et travailleurs.
          </p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card border rounded-lg p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'organisation</Label>
            <Input id="name" placeholder="Ex. Festival des Lumières" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Création…" : "Créer l'organisation"}
          </Button>
        </form>
      </div>
    </div>
  );
}
