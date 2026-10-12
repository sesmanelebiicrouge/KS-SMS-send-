# KS SMS Send

Site web Next.js pour préparer et envoyer des SMS via l’API Orange Developer.

## Fonctionnalités actuelles

- Formulaire mobile avec nom/ID d’expéditeur, numéro du destinataire et texte du SMS.
- Validation du numéro au format international et des champs obligatoires.
- Compteur de caractères (limite actuelle de 1 000 caractères).
- Bouton d’envoi avec état « Envoi en cours… ».
- Messages d’erreur lisibles en français.
- Appel serveur à Orange OAuth puis à l’API SMS : les clés restent côté serveur.
- Réponse distinguant une demande acceptée par Orange d’une livraison réellement confirmée.
- Métadonnées et styles de base en français, adaptés au mobile.

## Variables Vercel nécessaires

Configurer les trois variables côté serveur pour l’environnement Production (et Preview si nécessaire) :

- `ORANGE_CLIENT_ID` : identifiant de l’application Orange Developer.
- `ORANGE_CLIENT_SECRET` : secret de l’application Orange Developer.
- `ORANGE_SENDER_ADDRESS` : adresse d’expéditeur SMS exacte fournie/autorisé par Orange, au format attendu par le contrat API (par exemple une adresse `tel:+...` si c’est celle attribuée à ton compte).

Ne publie jamais les valeurs secrètes dans le dépôt GitHub, dans le navigateur ou dans une capture d’écran. Ne remplace pas l’adresse d’expéditeur par une valeur inventée.

## Développement

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000.

## API

- `GET /api/health` : vérifie uniquement la présence des variables de configuration ; ne teste pas l’authentification Orange et n’envoie aucun SMS.
- `POST /api/send` : valide les champs, demande un jeton OAuth à Orange puis soumet le SMS à l’API Orange.

## Limites importantes avant une ouverture publique

- Une réponse positive de l’API signifie que la demande a été acceptée, pas que le téléphone du destinataire a reçu le SMS.
- Les accusés de réception Orange (Delivery Receipt) ne sont pas encore intégrés ; la confirmation de livraison réelle n’est donc pas disponible.
- Avant d’ouvrir l’envoi à tout le public, ajouter une authentification, une limitation de débit persistante, une protection contre l’abus et un suivi des crédits/coûts SMS. Sans ces protections, un endpoint public peut être abusé.
- Le nom d’expéditeur doit être accepté par Orange. L’adresse technique `ORANGE_SENDER_ADDRESS` doit correspondre à la configuration réelle du compte.
- Aucun paiement ni système de crédits utilisateur n’est implémenté pour le moment.

## Déploiement

Vercel doit reconstruire automatiquement le projet après les commits sur la branche `main), si le dépôt y est déjà connecté. Vérifier le résultat du déploiement et tester d’abord avec un numéro que tu contrôles.
