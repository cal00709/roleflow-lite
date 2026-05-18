import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  return <Navigate to={user ? "/app" : "/login"} />;
}
