# KS SMS Send

Application Next.js pour préparer des campagnes SMS.

## Prérequis

- Node.js compatible avec la version de Next.js installée
- npm
- Un projet Supabase pour l'authentification et la persistance (pas encore connecté à ce dépôt)
- Un fournisseur SMS pris en charge, avec un compte et une clé API côté serveur

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

## État actuel

- Interface responsive de composition de SMS.
- Nettoyage et dédoublonnage des destinataires dans l'interface.
- Validation côté serveur du corps JSON, des numéros internationaux, des doublons et de la longueur du message.
- Endpoint `GET /api/health` pour vérifier que l'application répond.
- Endpoint `POST /api/sms/send` qui **refuse volontairement l'envoi** tant que l'authentification, les limites d'envoi, la journalisation et un fournisseur réel ne sont pas configurés.

## Important avant la mise en production

Aucun SMS réel ne sera envoyé par cette version. Il faut encore choisir le fournisseur SMS, connecter Supabase, mettre en place l'authentification serveur, les politiques RLS, une limitation de débit durable, une protection contre les envois répétés, les journaux d'audit et les statuts de livraison. Ne jamais exposer une clé secrète du fournisseur dans le navigateur ni la committer dans Git.

Les messages ne doivent être envoyés qu'à des destinataires autorisés, dans le respect des règles applicables et des mécanismes de désinscription.
