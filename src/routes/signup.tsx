import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUp, signInWithGoogle } from "@/features/auth/auth.api";
import { signUpSchema, type SignUpDTO } from "@/features/auth/auth.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<SignUpDTO>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignUpDTO) => {
    setSubmitting(true);
    try {
      await signUp(values);
      toast.success("Compte créé. Vérifiez votre email pour confirmer.");
      router.navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec d'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    try { await signInWithGoogle(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Échec OAuth"); }
  };

  return <AuthShell title="Créer un compte" subtitle="Rejoignez RoleFlow en quelques secondes.">
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nom complet</Label>
        <Input id="full_name" autoComplete="name" {...form.register("full_name")} />
        {form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Création…" : "Créer le compte"}
      </Button>
    </form>

    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">ou</span>
      </div>
    </div>
    <Button variant="outline" className="w-full" onClick={onGoogle}>
      Continuer avec Google
    </Button>

    <p className="text-sm text-center text-muted-foreground mt-6">
      Déjà un compte ?{" "}
      <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
    </p>
  </AuthShell>;
}
