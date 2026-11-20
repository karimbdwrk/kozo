// UI texts (French). Every user-facing string of the mobile app lives here.
// Keys are shared with the zod schemas and auth error mapping of @kozo/shared.

export const fr = {
  "common.loading": "Chargement…",
  "common.genericError": "Une erreur est survenue. Réessayez dans un instant.",
  "common.signOut": "Se déconnecter",
  "common.retry": "Réessayer",

  "auth.errors.emailInvalid": "Saisissez une adresse e-mail valide.",
  "auth.errors.passwordRequired": "Saisissez votre mot de passe.",
  "auth.errors.totpInvalid": "Le code doit contenir 6 chiffres.",
  "auth.errors.invalidCredentials": "Adresse e-mail ou mot de passe incorrect.",
  "auth.errors.emailNotConfirmed":
    "Confirmez d'abord votre adresse e-mail avec le lien que vous avez reçu.",
  "auth.errors.tooManyRequests": "Trop de tentatives. Patientez quelques minutes.",
  "auth.errors.totpWrong": "Code incorrect ou expiré. Vérifiez l'heure du téléphone et réessayez.",

  "auth.fields.email": "Adresse e-mail",
  "auth.fields.password": "Mot de passe",
  "auth.fields.totpCode": "Code à 6 chiffres",

  "auth.signIn.title": "Connexion",
  "auth.signIn.description": "Votre centre de formation vous a créé un compte.",
  "auth.signIn.submit": "Se connecter",
  "auth.signIn.forgotPassword":
    "Mot de passe oublié ? Réinitialisez-le depuis le site web de votre centre.",

  "auth.mfaEnroll.title": "Double authentification",
  "auth.mfaEnroll.description":
    "Elle est obligatoire pour protéger vos données. Configurez-la une seule fois.",
  "auth.mfaEnroll.start": "Commencer",
  "auth.mfaEnroll.step1":
    "Installez une application d'authentification (Google Authenticator, Microsoft Authenticator…).",
  "auth.mfaEnroll.openApp": "Ouvrir l'application d'authentification",
  "auth.mfaEnroll.manualKey": "Ou saisissez cette clé dans l'application :",
  "auth.mfaEnroll.step3": "Puis saisissez le code à 6 chiffres affiché.",
  "auth.mfaEnroll.submit": "Activer",
  "auth.mfaEnroll.cannotOpen":
    "Aucune application d'authentification trouvée. Saisissez la clé manuellement.",

  "auth.mfaVerify.title": "Double authentification",
  "auth.mfaVerify.description": "Saisissez le code de votre application d'authentification.",
  "auth.mfaVerify.submit": "Valider",
  "auth.mfaVerify.lostDevice":
    "Téléphone perdu ? Contactez le support de Kozo pour réinitialiser votre double authentification.",

  "home.title": "Mes centres",
  "home.empty": "Votre centre ne vous a pas encore donné accès. Contactez-le si besoin.",
} as const;

export type MessageKey = keyof typeof fr;
