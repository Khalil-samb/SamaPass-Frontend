# SamaPass : Frontend (Angular)

Interface web de **SamaPass / Kcrowd**, plateforme de billetterie en ligne pour le Sénégal : achat de billets avec Wave et Orange Money, QR Codes d'accès, espace organisateur, vidéos d'événements et assistant virtuel.

## Technologies

- Angular 22 (composants autonomes, signaux, contrôle de flux `@if` / `@for`)
- Tailwind CSS 4 et un système de design maison (`src/app/glass.css`)
- `qrcode` (génération des QR Codes) et `jsqr` (lecture par caméra)
- Vitest et jsdom pour les tests
- Docker + Nginx pour la mise en production

## Les espaces de l'application

| Espace | Contenu |
| --- | --- |
| Public | accueil, recherche, détail d'un événement, achat de billets, fil de vidéos |
| Utilisateur | mes billets, favoris, notifications, profil |
| Organisateur | tableau de bord, création et modification d'événements, ventes, reversements, scanner, campagnes sponsorisées, paramètres |
| Administrateur | utilisateurs, organisateurs, réglages de la plateforme, journal d'activité |

## Structure du code

```
src/app/
  core/       modèles, services HTTP, stores d'état, intercepteurs, gardes
  features/   pages par espace (public, user, organizer, admin, auth, entry, become-organizer)
  layout/     mises en page des trois espaces
  shared/     composants, directives et utilitaires partagés
```

## Lancer en développement

```bash
npm install
npm start          # http://localhost:4200
```

L'adresse de l'API se règle dans `src/environments.ts` (backend Django sur le port 8001 en local).

## Tests

```bash
npm test
```

## Docker

```bash
docker build -t samapass-frontend .
docker run -p 4200:80 samapass-frontend
```

## Projets liés

- **SamaPass_Backend** : API Django / Django REST Framework
- **chatbot-service** : service FastAPI de l'assistant virtuel
