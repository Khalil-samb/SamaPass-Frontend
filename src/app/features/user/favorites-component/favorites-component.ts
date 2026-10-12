import { Component, computed, OnInit, signal } from '@angular/core';
import { EventEntity, TicketType } from '../../../core/models';
import { AuthStore } from '../../../core/state/auth.store';
import { FavoritesService } from '../../../core/services/favorites.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { EventsService } from '../../../core/services/events.service';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';
import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

@Component({
  imports: [RouterLink, CardEventComponent, IconComponent],
  selector: 'app-favorites-component',
  styleUrl: './favorites-component.css',
  templateUrl: './favorites-component.html',
})
export class FavoritesComponent implements OnInit {
  loading = signal(true);
  idsFavoris = signal<string[]>([]);
  events = signal<EventEntity[]>([]);
  ticketTypes = signal<TicketType[]>([]);

  constructor(
    private authStore: AuthStore,
    private favoritesService: FavoritesService,
    private eventsService: EventsService,
    private ticketTypesService: TicketTypesService
  ) {}

  ngOnInit() {
    const userId = this.authStore.currentUser()?.id;
    if (userId) this.idsFavoris.set(this.favoritesService.obtenirFavoris(userId));

    this.eventsService.getAll().subscribe((e) => this.events.set(e ?? []));
    this.ticketTypesService.getAll().subscribe((tt) => {
      this.ticketTypes.set(tt ?? []);
      this.loading.set(false);
    });
  }

  cartesFavorites = computed<EventCardVM[]>(() =>
    this.events()
      .filter((e) => this.idsFavoris().includes(e.id))
      .map((e) => construireCarteEvenement(e))
  );

  retirer(eventId: string) {
    const userId = this.authStore.currentUser()?.id;
    if (!userId) return;
    this.favoritesService.toggleFavori(userId, eventId);
    this.idsFavoris.set(this.favoritesService.obtenirFavoris(userId));
  }
}
