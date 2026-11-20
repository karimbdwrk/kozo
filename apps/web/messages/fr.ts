// UI texts (French). Every user-facing string of the web app lives here.
// Keys are shared with the zod schemas of @kozo/shared (error messages are keys).

export const fr = {
  "app.name": "Kozo",
  "common.loading": "Chargement…",
  "common.genericError": "Une erreur est survenue. Réessayez dans un instant.",
  "common.signOut": "Se déconnecter",
  "common.backToSignIn": "Retour à la connexion",

  "auth.errors.emailInvalid": "Saisissez une adresse e-mail valide.",
  "auth.errors.passwordRequired": "Saisissez votre mot de passe.",
  "auth.errors.passwordTooShort": "Le mot de passe doit contenir au moins 12 caractères.",
  "auth.errors.passwordTooLong": "Le mot de passe ne doit pas dépasser 72 caractères.",
  "auth.errors.passwordsDoNotMatch": "Les deux mots de passe ne correspondent pas.",
  "auth.errors.nameRequired": "Ce champ est obligatoire.",
  "auth.errors.nameTooLong": "100 caractères maximum.",
  "auth.errors.totpInvalid": "Le code doit contenir 6 chiffres.",
  "auth.errors.invalidCredentials": "Adresse e-mail ou mot de passe incorrect.",
  "auth.errors.emailNotConfirmed":
    "Confirmez d'abord votre adresse e-mail avec le lien que nous vous avons envoyé.",
  "auth.errors.tooManyRequests":
    "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  "auth.errors.totpWrong":
    "Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez.",
  "auth.errors.weakPassword": "Ce mot de passe est trop faible. Choisissez-en un autre.",
  "auth.errors.samePassword": "Choisissez un mot de passe différent de l'actuel.",
  "auth.errors.linkInvalid": "Ce lien est invalide ou a expiré. Demandez-en un nouveau.",

  "auth.fields.email": "Adresse e-mail",
  "auth.fields.password": "Mot de passe",
  "auth.fields.newPassword": "Nouveau mot de passe",
  "auth.fields.confirmPassword": "Confirmez le mot de passe",
  "auth.fields.firstName": "Prénom",
  "auth.fields.lastName": "Nom",
  "auth.fields.totpCode": "Code à 6 chiffres",
  "auth.fields.passwordHint": "12 caractères minimum.",

  "auth.signIn.title": "Connexion",
  "auth.signIn.description": "Connectez-vous à votre espace.",
  "auth.signIn.submit": "Se connecter",
  "auth.signIn.forgotPassword": "Mot de passe oublié ?",
  "auth.signIn.noAccount": "Vous créez votre centre de formation ?",
  "auth.signIn.signUpLink": "Créer un compte",

  "auth.signUp.title": "Créer votre compte",
  "auth.signUp.description":
    "Pour les responsables de centre. Les apprenants et formateurs sont invités par leur centre.",
  "auth.signUp.submit": "Créer mon compte",
  "auth.signUp.hasAccount": "Déjà un compte ?",
  "auth.signUp.signInLink": "Se connecter",

  "auth.checkEmail.title": "Vérifiez votre boîte mail",
  "auth.checkEmail.description":
    "Si cette adresse peut être utilisée, vous allez recevoir un lien. Ouvrez-le depuis ce navigateur pour continuer.",

  "auth.forgotPassword.title": "Mot de passe oublié",
  "auth.forgotPassword.description":
    "Saisissez votre adresse : nous vous enverrons un lien pour choisir un nouveau mot de passe.",
  "auth.forgotPassword.submit": "Envoyer le lien",

  "auth.setPassword.title": "Choisir un mot de passe",
  "auth.setPassword.description": "Choisissez le mot de passe de votre compte.",
  "auth.setPassword.submit": "Enregistrer",

  "auth.mfaEnroll.title": "Activer la double authentification",
  "auth.mfaEnroll.description":
    "La double authentification est obligatoire. Elle protège les données de votre centre et de vos apprenants.",
  "auth.mfaEnroll.start": "Commencer",
  "auth.mfaEnroll.step1":
    "Installez une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password…).",
  "auth.mfaEnroll.step2": "Scannez ce QR code avec l'application.",
  "auth.mfaEnroll.manualKey": "Ou saisissez cette clé manuellement :",
  "auth.mfaEnroll.step3": "Saisissez le code à 6 chiffres affiché par l'application.",
  "auth.mfaEnroll.qrAlt": "QR code de configuration de la double authentification",
  "auth.mfaEnroll.submit": "Activer",

  "auth.mfaVerify.title": "Double authentification",
  "auth.mfaVerify.description":
    "Saisissez le code à 6 chiffres de votre application d'authentification.",
  "auth.mfaVerify.submit": "Valider",
  "auth.mfaVerify.lostDevice":
    "Téléphone perdu ? Contactez le support de Kozo pour réinitialiser votre double authentification.",

  "auth.error.title": "Lien invalide",

  "onboarding.title": "Créer votre centre de formation",
  "onboarding.description":
    "Votre centre est l'espace où vous gérerez vos formations, vos formateurs et vos apprenants.",
  "onboarding.fields.name": "Nom du centre",
  "onboarding.fields.slug": "Adresse de votre espace",
  "onboarding.fields.slugHint": "Lettres minuscules, chiffres et tirets. Exemple : centre-lyon",
  "onboarding.submit": "Créer mon centre",
  "onboarding.errors.centreNameInvalid": "Le nom doit contenir entre 2 et 200 caractères.",
  "onboarding.errors.slugInvalid":
    "Entre 3 et 50 caractères : lettres minuscules, chiffres et tirets (ni au début ni à la fin).",
  "onboarding.errors.slugTaken": "Cette adresse est déjà prise. Choisissez-en une autre.",
  "onboarding.errors.slugReserved": "Cette adresse est réservée. Choisissez-en une autre.",
  "onboarding.errors.quotaReached":
    "Votre abonnement ne permet pas d'ajouter un autre centre. Ajoutez un centre à votre abonnement pour continuer.",
  "onboarding.errors.emailNotConfirmed": "Confirmez d'abord votre adresse e-mail.",

  "home.chooseCentre": "Choisissez un centre",

  "dashboard.title": "Tableau de bord",
  "dashboard.empty": "Les modules de votre centre apparaîtront ici.",
  "dashboard.notFound": "Ce centre n'existe pas ou vous n'y avez pas accès.",
} as const;

export type MessageKey = keyof typeof fr;
