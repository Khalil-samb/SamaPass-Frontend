import { Component } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/ui/icon-component/icon-component';
import { AppNotification } from '../../../core/models';
import { NotificationsStore } from '../../../core/state/notifications.state';

const ICONE_PAR_TYPE: Record<string, IconName> = {
  event_reminder: 'calendar',
  payment_confirmation: 'ticket',
  new_event: 'calendar',
  new_sale: 'trending-up',
  payout: 'wallet',
  account: 'shield-check',
  new_organizer: 'briefcase',
  system: 'bell',
};

// Réécriture complète : cette page utilise maintenant le MÊME
// NotificationsStore que la cloche, au lieu d'appeler séparément
// NotificationsService. Avantages : plus de filtre par userId à faire soi-
// même (Django ne renvoie déjà que les notifications de la personne
// connectée), et lire une notification ici met aussi à jour la pastille de
// la cloche instantanément, sans recharger la page.
@Component({
  imports: [IconComponent],
  standalone: true,
  selector: 'app-notifications-list-component',
  styleUrl: './notifications-list-component.css',
  templateUrl: './notifications-list-component.html',
})
export class NotificationsListComponent {
  constructor(public store: NotificationsStore) {
    // "utiliser/liberer" comptent les écrans affichant des notifications :
    // pas de ngOnInit/ngOnDestroy nécessaires, le constructeur suffit ici
    // car cette page ne vit jamais plus longtemps que son propre composant.
    this.store.utiliser();
  }

  ngOnDestroy() {
    this.store.liberer();
  }

  // Alias pour garder le même nom que dans votre template existant
  get loading() {
    return this.store.chargement;
  }

  get mesNotifications() {
    return this.store.notifications;
  }

  get nonLues() {
    return () => this.store.notifications().filter((n) => !n.isRead);
  }

  icone(type: string): IconName {
    return ICONE_PAR_TYPE[type] ?? 'bell';
  }

  marquerCommeLue(notif: AppNotification) {
    this.store.marquerCommeLue(notif.id);
  }

  toutMarquerCommeLu() {
    this.store.toutMarquerCommeLu();
  }

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateISO));
  }
}
