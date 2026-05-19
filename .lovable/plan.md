# Stabiliser les contextes Auth & Organisation (boucle de rechargement)

## Symptômes observés
- L'app sur `/app` boucle : indicateur "Chargement…" qui apparaît/disparaît en rafale, puis "Internal Server Error".
- Les logs réseau montrent **des dizaines de requêtes identiques** à `GET /rest/v1/memberships?...` envoyées dans la même seconde.
- Le backend Lovable Cloud répond normalement (200). Le problème est donc côté client.

## Cause
Deux providers React entrent en boucle de re-render :

1. `AuthProvider` appelle `setSession(...)` à la fois depuis `onAuthStateChange` **et** depuis `getSession().then(...)`, et à chaque event Supabase (INITIAL_SESSION, TOKEN_REFRESHED, focus de l'onglet, etc.) un **nouvel objet session** est posé en state — même quand le token réel n'a pas changé.
2. `OrganisationProvider` recrée son `refresh` à chaque changement d'identité de `user` (`useCallback(..., [user])`) et son `useEffect([refresh])` relance donc `listMyMemberships()`. La valeur du context n'est pas mémoïsée, ce qui propage encore des re-renders aux consommateurs.

Résultat : chaque "tick" Supabase relance un fetch memberships, qui re-render tout l'arbre, qui peut redéclencher d'autres effets → boucle visible.

## Correctifs

### 1. `src/features/auth/auth-context.tsx`
- Ne pas écraser le state si la nouvelle session a le **même `access_token`** que l'actuelle (comparaison par valeur, pas par référence).
- Supprimer le double `setLoading(false)` redondant : `loading` ne doit passer à `false` qu'une fois la session initiale résolue.
- (Inchangé) garder l'ordre `onAuthStateChange` puis `getSession`.

### 2. `src/features/organisations/organisation-context.tsx`
- Utiliser `user?.id` (string stable) plutôt que l'objet `user` comme dépendance du `useCallback`/`useEffect` qui déclenche `refresh`.
- Mémoïser la valeur du context avec `useMemo` pour éviter une nouvelle référence à chaque render.
- Garder la persistance `localStorage` mais ne rien changer à l'auto-sélection d'orga.

## Hors-scope
- Pas de changement de schéma DB, pas de migration, pas de modif des routes.
- Pas de refonte de l'UI ni du flux d'onboarding.

## Vérification
- Recharger `/app` : un seul appel `/memberships` doit apparaître par session (pas une rafale).
- Plus de "Chargement…" clignotant, plus d'Internal Server Error.
