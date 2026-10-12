import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/state/auth.store';
// ⚠️ "notifications.store", pas "notifications.state" — c'est bien le nom
// du fichier livré. L'ancien chemin ne pouvait mener nulle part.
import { NotificationsStore } from '../../../core/state/notifications.state';
import { AppNotification } from '../../../core/models/notification.model';
import { IconComponent, IconName } from '../icon-component/icon-component';

@Component({
  // ⚠️ "app-notification-bell", pas "-component" à la fin : c'est ce nom
  // précis qui est déjà utilisé dans public-layout-component.html. Le
  // changer casserait la cloche partout où elle est déjà posée.
  selector: 'app-notification-bell',
  standalone: true,
  // ⚠️ RouterLink doit être ici : le template utilise [routerLink], sans
  // cette ligne Angular refuse de le reconnaître (l'erreur NG8002 vue).
  imports: [IconComponent, RouterLink],
  styleUrl: './notification-bell-component.css',
  templateUrl: './notification-bell-component.html',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  // Où mène "Voir tout" (la page complète des notifications)
  @Input() lienVoirTout = '/compte/notifications';

  // Côté d'où le panneau s'ouvre : 'droite' = aligné sur le bord droit de la
  // cloche (cas d'une cloche en haut à droite), 'gauche' = sur le bord gauche
  @Input() alignement: 'droite' | 'gauche' = 'droite';

  ouvert = signal(false);
  recentes = computed(() => this.store.notifications().slice(0, 8));

  constructor(
    public store: NotificationsStore,
    private authStore: AuthStore,
    private router: Router,
    private hote: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    this.store.utiliser();
  }

  ngOnDestroy() {
    this.store.liberer();
  }

  basculer() {
    const souhaite = !this.ouvert();
    this.ouvert.set(souhaite);
    // À l'ouverture, on recharge : on voit toujours l'état le plus récent
    if (souhaite) this.store.rafraichir();
  }

  fermer() {
    this.ouvert.set(false);
  }

  // Un clic n'importe où en dehors de la cloche la referme
  @HostListener('document:click', ['$event'])
  surClicDocument(event: MouseEvent) {
    if (this.ouvert() && !this.hote.nativeElement.contains(event.target as Node)) this.fermer();
  }

  @HostListener('document:keydown.escape')
  surEchap() {
    this.fermer();
  }

  ouvrir(n: AppNotification) {
    this.store.marquerCommeLue(n.id);
    this.fermer();
    const destination = this.destination(n);
    if (destination) this.router.navigateByUrl(destination);
  }

  // Où emmener la personne quand elle choisit une notification
  private destination(n: AppNotification): string | null {
    const role = this.authStore.currentUser()?.role;
    switch (n.type) {
      case 'payment_confirmation':
        return '/compte/mes-billets';
      case 'new_sale':
        return '/organisateur/ventes';
      case 'payout':
        return role === 'admin' ? '/admin' : '/organisateur/reversements';
      case 'new_event':
        return role === 'admin' ? '/admin' : '/organisateur/evenements';
      case 'new_organizer':
        return '/admin/organisateurs';
      default:
        return null;
    }
  }

  iconeDe(type: string): IconName {
    switch (type) {
      case 'payment_confirmation':
        return 'ticket';
      case 'new_sale':
        return 'trending-up';
      case 'payout':
        return 'wallet';
      case 'new_event':
        return 'calendar';
      case 'account':
        return 'shield-check';
      case 'new_organizer':
        return 'briefcase';
      default:
        return 'bell';
    }
  }

  stylePastille(type: string): string {
    switch (type) {
      case 'new_sale':
      case 'payout':
        return 'bg-emerald-50 text-emerald-700';
      case 'account':
        return 'bg-amber-50 text-amber-700';
      case 'payment_confirmation':
      case 'event_reminder':
        return 'bg-orange-50 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  ilYA(dateISO: string): string {
    const secondes = Math.floor((Date.now() - new Date(dateISO).getTime()) / 1000);
    if (Number.isNaN(secondes)) return '';
    if (secondes < 60) return "à l'instant";
    const minutes = Math.floor(secondes / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `il y a ${heures} h`;
    const jours = Math.floor(heures / 24);
    if (jours < 7) return `il y a ${jours} j`;
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(dateISO));
  }
}

