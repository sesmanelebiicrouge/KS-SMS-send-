# KS SMS Send — version prête à déployer

Cette version transforme l'ancien fichier HTML en projet Next.js structuré pour un déploiement Vercel.

## Important

Le projet est **prêt pour le déploiement**, mais il ne prétend pas encore envoyer des SMS réels ni traiter des cartes bancaires.

Il faut encore connecter :
1. une base de données pour les comptes, crédits et historiques ;
2. un vrai système d'authentification serveur ;
3. un fournisseur SMS/API ;
4. un prestataire de paiement sécurisé.

Ne mets jamais de numéro de carte, CVV ou OTP dans le code ou dans le chat.

## Installation

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

## Variables d'environnement

Copie `.env.example` vers `.env.local` et renseigne les valeurs nécessaires.

`SESSION_SECRET` doit être une longue valeur aléatoire.

## Déploiement Vercel

1. Mets ce dossier dans un dépôt GitHub.
2. Importe le dépôt dans Vercel.
3. Ajoute les variables d'environnement dans Vercel.
4. Lance le déploiement.

Le endpoint `/api/health` permet de vérifier l'état des intégrations.

## Architecture suivante

- Next.js App Router
- API Route pour health check
- configuration par variables d'environnement
- interface responsive
- séparation utilisateur/admin
- emplacement prévu pour base de données, SMS et paiement
