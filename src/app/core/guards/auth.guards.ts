import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth.store';

// Une garde vérifie les droits AVANT même que le composant ne s'affiche.
// Sans elle, taper directement l'URL dans la barre d'adresse contournait
// toute protection : Angular affichait la page sans rien vérifier.
//
// Bloque l'accès si la personne n'est PAS un organisateur connecté — que ce
// soit un visiteur non identifié, ou un simple utilisateur qui a tapé
// l'adresse par curiosité. Dans les deux cas, direction la connexion.
export const organizerGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.role() === 'organizer') {
    return true;
  }
  return router.createUrlTree(['/organisateur/connexion']);
};

// Même principe, côté administrateur.
export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.role() === 'admin') {
    return true;
  }
  return router.createUrlTree(['/admin/connexion']);
};
