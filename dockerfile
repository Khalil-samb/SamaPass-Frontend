# ============================================================================
# ÉTAPE 1 — Construction de l'application Angular
# ============================================================================
# npm 11 (votre packageManager) demande Node 20+ ; on prend une version
# récente et stable pour être tranquille avec Angular 22.
FROM node:22-alpine AS build

WORKDIR /app

# Copier UNIQUEMENT les fichiers de dépendances d'abord : Docker met cette
# étape en cache tant que package.json ne change pas, donc "npm ci" ne se
# relance pas inutilement à chaque modification de votre code.
COPY package.json package-lock.json ./
RUN npm ci

# Copier le reste du projet, puis construire pour la production
COPY . .
RUN npm run build -- --configuration production

# ============================================================================
# ÉTAPE 2 — Servir les fichiers construits avec Nginx
# ============================================================================
FROM nginx:alpine

# Chemin propre à Angular 22 (via @angular/build, le nouveau système de
# construction) : les fichiers finaux sont dans dist/<nom-réel-du-dossier>/browser/.
# "SamaPass-frontend" est le nom réel de votre dossier de projet (confirmé
# par "ls dist/") — pas le "name" de package.json, qui peut être différent.
COPY --from=build /app/dist/SamaPass-frontend/browser /usr/share/nginx/html

# Nécessaire pour une application Angular (SPA) : sans ce fichier, recharger
# la page sur une route comme /organisateur ou /evenements/123 renverrait
# une erreur 404, Nginx ne sachant pas que c'est Angular qui doit gérer
# cette route, pas un vrai dossier sur le disque.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
