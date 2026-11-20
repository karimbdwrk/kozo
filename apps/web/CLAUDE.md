# apps/web — Next.js (back-office et portails)

## Stack

Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, Supabase (`@supabase/ssr`),
react-hook-form + zod, TanStack Table pour les listes.
À décider (demande-moi) : librairie de planning (FullCalendar ou Schedule-X),
génération PDF des documents.

## Structure

- app/(auth)/ : login, magic link, MFA, invitation
- app/(app)/[orgSlug]/ : back-office par centre (une route par module)
- app/(portal)/ : portails apprenant, entreprise, financeur
- features/<module>/{components,actions,queries,schemas}.ts : code par module
- lib/supabase/{server,client,middleware}.ts : clients Supabase
- components/ui/ : shadcn (ajout via `pnpm dlx shadcn@latest add <composant>`,
  ne pas modifier sans raison)

## Règles

- Server Components par défaut. `"use client"` seulement pour l'interactivité.
- Mutations = Server Actions : valider avec zod, vérifier l'utilisateur et son rôle,
  puis écrire. Ne jamais faire confiance au client.
- Côté serveur, utiliser `supabase.auth.getUser()` pour autoriser (pas `getSession()`).
- Helpers obligatoires : `requireUser()`, `requireRole(roles)`, `requireModule(name)`.
  La navigation est filtrée par rôle et par modules activés, mais ce n'est jamais la
  seule protection.
- Seules `NEXT_PUBLIC_SUPABASE_URL` et la clé anon sont publiques. Aucun secret en
  `NEXT_PUBLIC_*`.
- Tables paginées et triées côté serveur. Pas de chargement de listes complètes.
- Chaque écran a ses états : chargement, vide, erreur, avec message en français.
- Formulaires : erreurs inline, boutons désactivés pendant l'envoi, pas de double envoi.
- Accessibilité de base (labels, focus, contraste, navigation clavier) et responsive.
- Pas d'accès direct à la base depuis un composant client pour des données sensibles :
  passer par une Server Action ou une route.

## Tests

- Vitest : schémas zod, fonctions de calcul (conflits, quotas, échéances).
- Playwright : parcours critiques (connexion, création de salle, inscription,
  émargement). Un parcours E2E par module livré.
