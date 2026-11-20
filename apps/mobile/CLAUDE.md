# apps/mobile — Expo (apprenant et formateur)

## Stack

Expo (version du package.json), Expo Router, TypeScript strict, Gluestack UI
(composants dans components/ui), supabase-js, expo-camera (scan QR), expo-location,
expo-notifications, expo-local-authentication, expo-secure-store. Builds via EAS.

## Périmètre

- Apprenant : planning, émargement (scan QR), documents, questionnaires, résultats.
- Formateur : planning, ouverture de l'émargement (QR/PIN), liste des présents, notes.
- Direction : lecture et validations seulement. Aucun back-office dans le mobile.

## Règles

- Session Supabase : adaptateur de stockage dédié. SecureStore limite la taille des
  valeurs (~2 Ko) : chiffre la session et stocke la clé dans SecureStore.
- Jamais de `service_role` dans l'app. Toute logique sensible passe par une Edge Function.
- Émargement : l'app envoie le token du QR (+ position si le centre l'exige) à l'Edge
  Function `attendance-scan`. Le serveur décide (token valide, fenêtre de temps, zone).
  Aucun calcul de validité côté app.
- Géolocalisation : permission « pendant l'utilisation » uniquement, une lecture unique au
  scan, jamais en arrière-plan. Si la permission est refusée, l'app propose le repli
  (validation par le formateur).
- Textes de permissions (caméra, localisation, notifications) rédigés en français.
- Offline-first : pas en V1, mais isole la couche d'accès aux données (hooks/repositories)
  pour pouvoir l'ajouter sans réécrire les écrans.
- Listes longues avec FlashList. Gestion des états chargement, vide, erreur.
- Accessibilité : tailles tactiles, contrastes, lecteurs d'écran.
- Thème : mêmes tokens de couleur que le web (packages/shared).

## Tests

- jest-expo pour la logique et les hooks.
- Maestro pour les parcours critiques (connexion, scan QR, consultation du planning).
