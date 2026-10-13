# KS SMS Send

Application Next.js en français pour envoyer des SMS avec Orange Developer et confirmer un numéro par OTP.

## Fonctions

- Envoi de SMS génériques via `POST /api/send`.
- Demande d'un code OTP à 6 chiffres via `POST /api/otp/request`.
- Code stocké sous forme de HMAC, expiration après 5 minutes, vérification à usage unique.
- Limites de demandes par numéro et adresse IP via Redis persistant.
- Jeton de vérification signé valable 10 minutes, validable côté serveur via `POST /api/otp/verify-token`.
- Réponses API sans cache et secrets conservés côté serveur.
- Vérifications TypeScript et build automatisées sur GitHub Actions.

## Variables serveur nécessaires

À configurer dans Vercel pour les environnements souhaités (Preview pour test, Production pour mise en service) :

- `ORANGE_CLIENT_ID` : identifiant de l’application Orange Developer.
- `ORANGE_CLIENT_SECRET` : secret de l’application Orange Developer.
- `ORANGE_SENDER_ADDRESS` : adresse d’expéditeur exacte attribuée par Orange, au format attendu par l’API (par exemple `tel:+...`).
- `ORANGE_SENDER_NAME` : nom d’expéditeur personnalisé approuvé par Orange. Dans la version actuelle de `POST /api/send`, cette variable est obligatoire et le nom envoyé doit correspondre exactement à cette valeur.
- `UPSTASH_REDIS_REST_URL` : URL REST de la base Redis/Upstash persistante.
- `UPSTASH_REDIS_REST_TOKEN` : jeton REST Redis/Upstash.
- `OTP_SECRET` : secret aléatoire d’au moins 32 octets pour hacher les OTP et signer les jetons.
- `ORANGE_SMS_ENABLED` : laisser `false` pendant la configuration et les tests. Passer à `true` uniquement après validation des identifiants, du contrat/crédit SMS, de l’expéditeur autorisé et de Redis. Cette variable doit être définie dans l’environnement Vercel du déploiement à tester.

Génère `OTP_SECRET` dans un gestionnaire de secrets ou un générateur cryptographique fiable. N’envoie jamais de secret dans GitHub, dans le navigateur, dans une capture d’écran ou dans le chat.

## Distinction importante sur l’OTP

La page `/otp` vérifie le numéro de téléphone par SMS afin d’autoriser temporairement l’envoi depuis le formulaire. Ce parcours ne remplace pas l’OTP par e-mail de Supabase pour la création d’un compte ou la réinitialisation d’un mot de passe : ces parcours doivent rester gérés séparément dans Supabase Auth.

## API OTP

- `POST /api/otp/request` avec `{ "phone": "+2250700000000" }`: envoie un code si la configuration et les limites le permettent.
- `POST /api/otp/verify` avec `{ "phone": "+2250700000000", "code": "123456" }`: vérifie le code et renvoie un jeton signé.
- `POST /api/otp/verify-token` avec `{ "token": "..." }`: valide la signature et l’expiration du jeton côté serveur.
- `GET /api/health`: indique seulement si certaines variables sont présentes ; ne teste pas les identifiants Orange et n’envoie aucun SMS.

## Sécurité et limites

- L’OTP expire en 5 minutes, est à usage unique et est conservé sous forme de HMAC.
- Limitation persistante : au plus 3 demandes par numéro et 10 par IP sur 10 minutes ; au plus 5 vérifications par numéro sur 5 minutes.
- Redis/Upstash est obligatoire pour la protection persistante. Si le stockage n’est pas configuré ou est indisponible, l’API échoue en mode fermé.
- Le jeton signé est une preuve de vérification temporaire. L’application qui l’utilise doit le valider côté serveur ; ne te fie pas uniquement au navigateur.
- Avant ouverture publique, ajouter l’authentification de l’application appelante, une politique de coûts/quotas et une surveillance des envois. Ne publie pas un endpoint SMS générique sans protection.
- L’acceptation par Orange ne garantit pas que le SMS a été livré. Les accusés de réception Orange ne sont pas encore intégrés.

## Développement

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Vercel peut déployer automatiquement les commits sur `main` si le dépôt est connecté. Les corrections de cette branche doivent être testées via une Preview avant toute fusion dans `main`.
