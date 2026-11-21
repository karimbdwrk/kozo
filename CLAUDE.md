# Kozo — plateforme de gestion pour organismes de formation (nom provisoire)

## Produit

SaaS multi-centres pour organismes de formation (OF), puis alternance/CFA, formations
réglementées. V1 = OF uniquement. Les écoles (notes, bulletins, ECTS) sont hors V1.

- Entité pivot : la `session` (créneau daté = cohorte + module + formateur + salle).
  Émargement, documents et évaluations s'y rattachent.
- Hiérarchie : organization (« centre » dans l'UI) → campus (une adresse ; table
  `campuses`, porte le SIRET) → room (salle). Vocabulaire UI : centre, campus, salle.
- Rôles : super_admin, direction, pedagogique, admin_staff, commercial, comptabilite,
  qualite, referent_handicap, formateur, apprenant, + rôles entreprise
  (admin, rh, tuteur, comptabilite) et financeur (lecture seule).
- Modules activables par centre (`organization_settings.enabled_modules`) ; plans
  tarifaires = combinaisons de modules.

## Monorepo

- apps/web : Next.js (App Router) — back-office + portails entreprise/financeur/apprenant
- apps/mobile : Expo — apprenant et formateur uniquement (pas de back-office)
- packages/shared : types DB générés, schémas zod, constantes (rôles, statuts)
- supabase/ : migrations, Edge Functions, tests SQL
- Gestionnaire : pnpm. Orchestration : turbo.

## Règles non négociables

1. Isolation multi-tenant : toute table métier a `organization_id` et RLS activée.
   Aucune table sans policy. Une fuite entre centres est l'incident à éviter à tout prix.
2. L'autorisation vit en base (RLS) et côté serveur, jamais seulement dans l'UI.
   Les modules activés sont vérifiés à 3 endroits : UI, API, RLS.
3. `service_role` n'apparaît jamais dans le web client ni dans le mobile. Uniquement
   dans du code serveur (Edge Functions, Server Actions server-only).
4. Données sensibles (handicap, n° de sécu, coordonnées GPS brutes) : jamais dans les
   logs, l'analytics ou les messages d'erreur.
5. Dates : `timestamptz` en base, affichage en Europe/Paris, récurrence calculée en
   heure locale (attention aux changements d'heure).
6. Pas de valeur probante maison : la signature électronique juridiquement engageante
   passe par un prestataire qualifié.
7. Ne jamais écrire « conforme Qualiopi » ou « garanti » dans l'UI ou les textes :
   l'outil collecte des preuves, il ne certifie rien.
8. Ne jamais modifier une migration déjà appliquée : toujours une nouvelle migration.

## Conventions

- TypeScript strict, pas de `any`. Validation zod à toutes les frontières
  (formulaires, Server Actions, Edge Functions, réponses externes).
- Code et identifiants en anglais ; UI et messages utilisateur en français, via fichiers
  de messages (pas de chaînes en dur).
- Commits conventionnels (feat:, fix:, chore:), petits et ciblés.
- Pas de nouvelle dépendance sans me demander.
- Pas de fichier de documentation non demandé.

## Commandes

- `pnpm i` · `pnpm dev:web` · `pnpm dev:mobile`
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `supabase start` · `supabase db reset` · `supabase test db`
- `pnpm db:types` (génère packages/shared/src/database.types.ts)

## Méthode de travail

- Pour tout changement non trivial : propose un plan court, puis exécute par étapes.
- Avant de dire « terminé » : typecheck, lint et tests passent.
- Toute nouvelle policy RLS = un test d'isolation entre deux organisations.
- Sur les règles métier (Qualiopi, Cerfa, OPCO, BPF, RGPD) : si tu n'es pas sûr,
  dis-le et signale-le dans le code (TODO: valider avec un OPCO / un juriste).
  N'invente jamais une règle réglementaire.
