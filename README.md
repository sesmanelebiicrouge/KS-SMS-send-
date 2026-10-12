# KS SMS Send

Application Next.js pour préparer des campagnes SMS.

## Prérequis

- Node.js compatible avec Next.js
- npm
- Un projet Supabase pour Auth et la persistance
- Un fournisseur SMS pris en charge, avec clé API conservée côté serveur

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Commandes de vérification :

```bash
npm run typecheck
npm run lint
npm run build
```

## Authentification e-mail OTP

La page `/register` demande une adresse e-mail, envoie un code à usage unique via Supabase Auth, vérifie ce code et ouvre une session côté navigateur.

Pour activer ce parcours :

1. Définissez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` avec les valeurs publiques de votre projet Supabase.
2. Dans Supabase Authentication, activez l'inscription par e-mail et configurez l'envoi SMTP pour la production.
3. Dans le modèle d'e-mail de confirmation, incluez le code `{{ .Token }}` si vous souhaitez saisir un OTP numérique. Un modèle configuré uniquement pour un lien magique ne présentera pas le code comme attendu.
4. Configurez le Site URL et les URL autorisées dans Supabase.
5. Testez en production avec un compte e-mail de contrôle et vérifiez les limites de débit.

La clé `service_role` / secret Supabase ne doit jamais être exposée dans le navigateur.

## État actuel

- Interface responsive de composition SMS, validation des numéros et suppression des doublons.
- Page d'inscription et confirmation e-mail par OTP via Supabase Auth.
- Endpoint `GET /api/health`.
- Endpoint `POST /api/sms/send` qui refuse volontairement l'envoi tant qu'un fournisseur réel, l'authentification serveur, les quotas et la journalisation ne sont pas configurés.

## Avant la mise en production

Il faut encore connecter et vérifier le vrai projet Supabase, protéger les pages et les API par une session serveur, ajouter les tables de profil/historique avec RLS, choisir le fournisseur SMS, puis mettre en place quotas, idempotence, journaux d'audit et statuts de livraison. Les SMS ne doivent être envoyés qu'aux destinataires autorisés.
