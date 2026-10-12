# KS SMS Send

Application Next.js en français pour composer et préparer des SMS.

## Fonctionnalités de l’interface

- Identifiant d’expéditeur alphanumérique (jusqu’à 11 caractères; l’acceptation dépend du pays et de l’opérateur).
- Un ou plusieurs numéros au format international, avec validation et suppression des doublons.
- Message de 1 à 2 000 caractères et estimation indicative des segments.
- Zone de rapport prévue pour afficher un statut par numéro : en attente, accepté par le fournisseur, livré ou échec.

Aucun numéro de téléphone n’est requis pour créer ou récupérer un compte : l’authentification de compte se fait par e-mail. Le numéro de téléphone saisi dans le formulaire principal est uniquement celui du destinataire du SMS.

## État réel et sécurité

L’interface et la validation sont présentes, mais **l’envoi SMS réel est volontairement désactivé** tant qu’un fournisseur, l’authentification serveur, les quotas et la journalisation ne sont pas configurés. Aucun succès ni statut de livraison ne doit être affiché sans confirmation du fournisseur.

Pour connaître la livraison réelle, le fournisseur doit prendre en charge les reçus de livraison (DLR) et appeler un webhook sécurisé. Le serveur devra vérifier ce webhook et enregistrer le statut associé à chaque identifiant de message. « Envoyé » ne signifie pas nécessairement « reçu ».

## Authentification e-mail OTP

La page `/register` contient le parcours Supabase Auth : demande d’un code par e-mail, renvoi et vérification du code. Son fonctionnement réel **n’est pas encore vérifié de bout en bout** : il faut un projet Supabase accessible, les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, le modèle e-mail avec `{{ .Token }}` si un code numérique est souhaité, SMTP de production et URL autorisées correctes.

Ne jamais exposer la clé `service_role` ou une clé secrète dans le navigateur.

## Installation et contrôles

```bash
npm install
cp .env.example .env.local
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Étapes restantes avant production

1. Connecter et tester le vrai projet Supabase et protéger les API par une session serveur.
2. Choisir un fournisseur SMS disponible dans les pays visés et vérifier l’autorisation de l’identifiant expéditeur.
3. Configurer l’envoi, les quotas, la protection anti-doublon et le journal d’audit.
4. Configurer un webhook de reçus de livraison et tester les statuts réels.
