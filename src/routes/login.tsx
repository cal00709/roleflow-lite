import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { signIn, signInWithGoogle } from "@/features/auth/auth.api";
import { signInSchema, type SignInDTO } from "@/features/auth/auth.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/app" });
  }, [loading, user, router]);

  const form = useForm<SignInDTO>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInDTO) => {
    setSubmitting(true);
    try {
      await signIn(values);
      toast.success("Connexion réussie");
      router.navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec OAuth");
    }
  };

  return <AuthShell title="Connexion" subtitle="Accédez à votre espace RoleFlow.">
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Connexion…" : "Se connecter"}
      </Button>
    </form>

    <Divider />
    <Button variant="outline" className="w-full" onClick={onGoogle}>
      Continuer avec Google
    </Button>

    <p className="text-sm text-center text-muted-foreground mt-6">
      Pas encore de compte ?{" "}
      <Link to="/signup" className="text-primary hover:underline font-medium">Créer un compte</Link>
    </p>
  </AuthShell>;
}

function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">ou</span>
      </div>
    </div>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/10 via-accent to-background">
        <div>
          <p className="text-2xl font-semibold tracking-tight">RoleFlow</p>
          <p className="text-sm text-muted-foreground mt-1">Gestion des rôles pour activités</p>
        </div>
        <div>
          <p className="text-xl font-medium leading-snug max-w-sm">
            Centralisez vos plannings, simplifiez les affectations.
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Une plateforme moderne pour vos travailleurs, vos évènements et vos shifts.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
