import { Injectable, inject, signal } from '@angular/core';
import { NotificationsService } from '../services/notifications.service';
import { AppNotification } from '../models/notification.model';
import { AuthStore } from './auth.store';

const INTERVALLE_MS = 20_000;

// L'état des notifications, partagé par TOUS les écrans qui en affichent (la
// cloche du site public, celle de l'espace organisateur, la page complète...) :
// un seul chargement et une seule vérification pour tout le monde, donc un
// compteur toujours identique partout.
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private notificationsService = inject(NotificationsService);
  private authStore = inject(AuthStore);

  notifications = signal<AppNotification[]>([]);
  nonLues = signal(0);
  chargement = signal(false);

  private minuteur: ReturnType<typeof setInterval> | null = null;
  private utilisateurId: string | null = null;
  private derniereSignature = '';

  // Nombre d'écrans qui affichent actuellement des notifications : on ne
  // vérifie le serveur que tant qu'il y en a au moins un.
  private utilisateurs = 0;

  // À appeler quand un écran qui affiche des notifications apparaît
  utiliser() {
    this.utilisateurs++;

    // Une AUTRE personne s'est connectée depuis : on repart de zéro, sinon les
    // notifications de la précédente s'afficheraient un instant.
    const id = this.authStore.currentUser()?.id ?? null;
    if (id !== this.utilisateurId) {
      this.reinitialiser();
      this.utilisateurId = id;
    }
    if (!id) return;

    this.charger();

    if (this.minuteur === null && typeof window !== 'undefined') {
      this.minuteur = setInterval(() => this.verifier(), INTERVALLE_MS);
    }
  }

  // À appeler quand cet écran disparaît
  liberer() {
    this.utilisateurs = Math.max(0, this.utilisateurs - 1);
    if (this.utilisateurs === 0) this.arreter();
  }

  // Recharge la liste complète : à l'ouverture de la cloche, et après une action
  charger() {
    if (!this.authStore.currentUser()) return;
    this.chargement.set(true);
    this.notificationsService.getAll().subscribe({
      next: (liste) => {
        const notifications = liste ?? [];
        this.notifications.set(notifications);
        this.nonLues.set(notifications.filter((n) => !n.isRead).length);
        this.chargement.set(false);
      },
      // Une coupure réseau ne doit jamais casser l'interface : on garde ce qu'on a
      error: () => this.chargement.set(false),
    });
  }

  rafraichir() {
    this.charger();
  }

  marquerCommeLue(notificationId: string) {
    const cible = this.notifications().find((n) => n.id === notificationId);
    if (!cible || cible.isRead) return;

    // Mise à jour IMMÉDIATE à l'écran : la personne voit le résultat tout de
    // suite, sans attendre le serveur. Si le serveur refuse, on recharge la
    // vérité.
    this.notifications.update((liste) => liste.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    this.nonLues.update((n) => Math.max(0, n - 1));

    this.notificationsService.marquerCommeLue(notificationId).subscribe({
      error: () => this.charger(),
    });
  }

  toutMarquerCommeLu() {
    if (this.nonLues() === 0) return;

    this.notifications.update((liste) => liste.map((n) => ({ ...n, isRead: true })));
    this.nonLues.set(0);

    this.notificationsService.toutMarquerCommeLu().subscribe({
      error: () => this.charger(),
    });
  }

  // Appelée toutes les 20 s : UNE requête légère. La liste complète n'est
  // rechargée que si quelque chose a réellement changé côté serveur.
  private verifier() {
    // Onglet en arrière-plan : inutile d'interroger le serveur pour personne
    if (typeof document !== 'undefined' && document.hidden) return;

    if (!this.authStore.currentUser()) {
      this.reinitialiser();
      this.utilisateurId = null;
      return;
    }

    this.notificationsService.compterNonLues().subscribe({
      next: (resume) => {
        const signature = `${resume.nonLues}|${resume.derniere}`;
        if (signature !== this.derniereSignature) {
          this.derniereSignature = signature;
          this.charger();
        }
      },
      error: () => {
        // silencieux : on réessaiera dans 20 s
      },
    });
  }

  private arreter() {
    if (this.minuteur !== null) {
      clearInterval(this.minuteur);
      this.minuteur = null;
    }
  }

  private reinitialiser() {
    this.notifications.set([]);
    this.nonLues.set(0);
    this.derniereSignature = '';
  }
}
