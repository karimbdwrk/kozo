# supabase — base de données, auth, Edge Functions

## Structure

- migrations/ : une migration par changement, nommée `supabase migration new <nom>`
- functions/ : Edge Functions (Deno)
- tests/ : tests pgTAP (`supabase test db`)
- seed.sql : données de démo fictives uniquement

## Schéma

- Tables en snake_case, pluriel. Clé `id uuid default gen_random_uuid()`.
- Colonnes `created_at` et `updated_at` (timestamptz) sur chaque table.
- Toute table métier : `organization_id uuid not null references organizations(id)
on delete cascade`, avec index sur `organization_id` et sur chaque clé étrangère.
- Statuts en enum ou en `check`. Dates en `timestamptz`.
- Extensions : btree_gist (contraintes d'exclusion), postgis (géoloc), pg_cron (purges RGPD).
- Planning : conflits salle / formateur / cohorte garantis par des contraintes
  d'exclusion (`exclude using gist`), pas seulement par l'UI.

## RLS (règle d'or)

- `enable row level security` sur chaque table, sans exception.
- Policies séparées par opération (select / insert / update / delete).
- Utiliser `(select auth.uid())` dans les policies (plus performant).
- Helpers (membership, rôle, module activé) dans le schéma `private`,
  `security definer`, `set search_path = ''`.
- Ne jamais autoriser à partir de `user_metadata` (modifiable par l'utilisateur).
  Les droits viennent de la table `memberships` et d'`app_metadata`.
- Tables sensibles (handicap, finances, exports) : policy restrictive exigeant `aal2`.
- Vues exposées aux entreprises ou aux financeurs : `security_invoker = true`, avec
  uniquement les colonnes autorisées.

## Edge Functions

- JWT vérifié (`verify_jwt`) sauf webhook explicitement signé.
- Secrets via `supabase secrets`. Jamais de secret dans le code.
- Validation zod de toutes les entrées. Réponses typées.
- Prévues : `attendance-scan`, `attendance-qr-token`, `send-notifications`,
  `generate-document`.

## Tests

- Chaque table a un test d'isolation pgTAP : deux organisations A et B, un utilisateur
  de A ne lit, n'insère, ne modifie ni ne supprime rien de B.
- Chaque contrainte d'exclusion a un test (chevauchement refusé, annulé accepté).
- Ces tests tournent en CI à chaque PR.

## Types

`pnpm db:types` régénère `packages/shared/src/database.types.ts` après chaque migration.
