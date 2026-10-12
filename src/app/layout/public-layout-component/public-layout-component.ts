import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent } from '../../shared/ui/icon-component/icon-component';
import { AuthStore } from '../../core/state/auth.store';

import { HostListener, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FavoritesService } from '../../core/services/favorites.service';
import { TicketsService } from '../../core/services/tickets.service';
import { EventsService } from '../../core/services/events.service';
import { ChatbotWidgetComponent } from '../../shared/ui/chatbot-widget-component/chatbot-widget-component';
//  NOTIFICATIONS : NotificationsService n'est plus utilisé ICI — c'est
// maintenant NotificationBellComponent qui s'en occupe tout seul, via
// NotificationsStore. Le retirer d'ici évite d'avoir deux systèmes
// différents qui interrogent Django chacun de leur côté.
import { NotificationBellComponent } from '../../shared/ui/notification-bell-component/notification-bell-component';


@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, IconComponent, ChatbotWidgetComponent, NotificationBellComponent],
  standalone:true,
  selector: 'app-public-layout-component',
  styleUrl: './public-layout-component.css',
  templateUrl: './public-layout-component.html',
})
export class PublicLayoutComponent {

  rechercheRapide = '';
  menuOuvert = signal(false);
  favorisPopoverOuvert = signal(false);
  billetsPopoverOuvert = signal(false);

  favorisPopover = signal<{ id: string; eventId: string; titre: string; image: string; date: string }[]>([]);
  billetsPopover = signal<{ id: string; titre: string; image: string; date: string; categorie: string }[]>([]);
  favorisTotal = signal(0);
  billetsTotal = signal(0);
  favorisChargement = signal(false);
  billetsChargement = signal(false);

  constructor(
    private router: Router,
    public authStore: AuthStore,
    private favoritesService: FavoritesService,
    private ticketsService: TicketsService,
    private eventsService: EventsService
  ) {
    // Chaque changement de page referme le menu et les fenêtres déroulantes
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.fermerMenu();
        this.fermerPopovers();
      }
    });
  }

  // Première lettre du prénom, pour la pastille du profil
  initiale = computed(() => (this.authStore.currentUser()?.firstName ?? '?').trim().charAt(0).toUpperCase() || '?');

  basculerMenu() {
    const souhaite = !this.menuOuvert();
    this.fermerPopovers();
    this.menuOuvert.set(souhaite);
  }

  fermerMenu() {
    this.menuOuvert.set(false);
  }

  // Un clic en dehors de l'en-tête referme le menu ; un clic en dehors d'une fenêtre déroulante la referme.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const cible = event.target as HTMLElement;
    if (!cible.closest('[data-popover]')) this.fermerPopovers();
    if (!cible.closest('[data-menu]')) this.fermerMenu();
  }

  @HostListener('document:keydown.escape')
  surEchap() {
    this.fermerMenu();
    this.fermerPopovers();
  }

  // En passant à un grand écran (rotation, redimensionnement), le menu téléphone n'a plus de raison d'être ouvert
  @HostListener('window:resize')
  surRedimensionnement() {
    if (this.menuOuvert() && window.innerWidth >= 1024) this.fermerMenu();
  }

  fermerPopovers() {
    this.favorisPopoverOuvert.set(false);
    this.billetsPopoverOuvert.set(false);
  }

  toggleFavorisPopover(_event?: MouseEvent) {
    const nouvelEtat = !this.favorisPopoverOuvert();
    this.fermerMenu();
    this.fermerPopovers();
    this.favorisPopoverOuvert.set(nouvelEtat);
    if (nouvelEtat) this.chargerFavoris();
  }

  toggleBilletsPopover(_event?: MouseEvent) {
    const nouvelEtat = !this.billetsPopoverOuvert();
    this.fermerMenu();
    this.fermerPopovers();
    this.billetsPopoverOuvert.set(nouvelEtat);
    if (nouvelEtat) this.chargerBillets();
  }

  private chargerFavoris() {
    this.favorisChargement.set(true);
    forkJoin({
      favoris: this.favoritesService.getMesFavoris(),
      events: this.eventsService.getAll(),
    }).subscribe({
      next: ({ favoris, events }: { favoris: any[]; events: any[] }) => {
        this.favorisTotal.set(favoris.length);
        this.favorisPopover.set(
          favoris.slice(0, 5).map((f) => {
            const e = events.find((x) => x.id === f.event);
            return {
              id: f.id,
              eventId: f.event,
              titre: e?.title ?? 'Événement',
              image: e?.coverImageUrl ?? '',
              date: e?.startDate ?? '',
            };
          })
        );
        this.favorisChargement.set(false);
      },
      error: () => this.favorisChargement.set(false),
    });
  }

  private chargerBillets() {
    this.billetsChargement.set(true);
    forkJoin({
      billets: this.ticketsService.mesBillets(),
      events: this.eventsService.getAll(),
    }).subscribe({
      next: ({ billets, events }: { billets: any[]; events: any[] }) => {
        const tries = billets.slice().sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate)));
        this.billetsTotal.set(tries.length);
        this.billetsPopover.set(
          tries.slice(0, 5).map((b) => {
            const e = events.find((x) => x.id === b.event);
            return {
              id: b.id,
              titre: e?.title ?? 'Billet',
              image: e?.coverImageUrl ?? '',
              date: e?.startDate ?? b.purchaseDate,
              categorie: b.ticketTypeName ?? '',
            };
          })
        );
        this.billetsChargement.set(false);
      },
      error: () => this.billetsChargement.set(false),
    });
  }

  // Retire un favori depuis la popup, puis recharge la liste
  retirerFavori(eventId: string) {
    this.favoritesService.retirer(eventId).subscribe(() => this.chargerFavoris());
  }

  formaterDatePopover(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(dateISO));
  }


  lancerRechercheRapide() {
    if (!this.rechercheRapide.trim()) return;
    this.router.navigate(['/evenements'], { queryParams: { q: this.rechercheRapide } });
  }

  seDeconnecter() {
    this.fermerMenu();
    this.authStore.logout();
    this.router.navigateByUrl('/bienvenue');
  }
}

