import { BadgeStatusComponent } from './../../../shared/ui/badge-status-component/badge-status-component';
import { Component, signal, computed, effect, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { CategoriesService } from '../../../core/services/categories.service';
import { CitiesService } from '../../../core/services/cities.service';
import { TransactionsService } from '../../../core/services/transactions.service';

import { Category } from '../../../core/models/category.model';
import { City } from '../../../core/models/city.model';
import { EventEntity, EventStatus } from '../../../core/models/event.model';
import { Transaction } from '../../../core/models/transaction.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';


interface FiltreStatut {
  valeur: EventStatus | '';
  label: string;
}

@Component({
  selector: 'app-my-events-list-component',
  standalone: true,
  imports: [RouterLink, IconComponent, BadgeStatusComponent],
  templateUrl: './my-events-list-component.html',
})
export class MyEventsListComponent implements OnDestroy {
  categories = signal<Category[]>([]);
  cities = signal<City[]>([]);
  statutFiltre = signal<EventStatus | ''>('');

  toutesLesTransactions = signal<Transaction[]>([]);

  filtresStatut: FiltreStatut[] = [
    { valeur: '', label: 'Tous' },
    { valeur: 'published', label: 'Publiés' },
    { valeur: 'draft', label: 'Brouillons' },
    { valeur: 'sold_out', label: 'Complets' },
    { valeur: 'finished', label: 'Terminés' },
  ];

  constructor(
    public eventStore: SelectedEventStore,
    private categoriesService: CategoriesService,
    private citiesService: CitiesService,
    private transactionsService: TransactionsService,
    private router: Router
  ) {
    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));
    this.citiesService.getAll().subscribe((c) => this.cities.set(c ?? []));

    // Avant : tout (événements ET transactions) était chargé UNE seule fois,
    // d'où des « vendus / total », un statut « Complet » et des recettes qui
    // restaient figés tant qu'on ne quittait pas l'espace organisateur.
    // Maintenant les événements viennent du store, rafraîchi à l'arrivée sur la
    // page puis automatiquement ; et les transactions (recettes) se rechargent
    // chaque fois que ces données ont vraiment changé.
    effect(() => {
      this.eventStore.versionDonnees();
      this.transactionsService.toutesLesTransactions().subscribe((t) => this.toutesLesTransactions.set(t ?? []));
    });
    this.eventStore.utiliser();
    void this.eventStore.rafraichir();
  }

  ngOnDestroy() {
    this.eventStore.liberer();
  }

  evenementsFiltres = computed(() => {
    const filtre = this.statutFiltre();
    return this.eventStore
      .events()
      .filter((e) => !filtre || e.status === filtre)
      .map((event) => {
        const types = event.ticketTypes ?? [];
        const transactions = this.toutesLesTransactions().filter(
          (t: any) => t.event === event.id && t.type === 'ticket_purchase' && t.status === 'success'
        );

        return {
          event,
          billetsVendus: types.reduce((s, t) => s + t.quantitySold, 0),
          billetsTotal: types.reduce((s, t) => s + t.quantityTotal, 0),
          recettes: transactions.reduce((s, t) => s + t.amount, 0),
        };
      });
  });

  categoryName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '';
  }

  cityName(id: string): string {
    return this.cities().find((c) => c.id === id)?.name ?? '';
  }

  dateLabel(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateISO));
  }

  ouvrirTableauDeBord(eventId: string) {
    this.eventStore.selectionner(eventId);
    this.router.navigateByUrl('/organisateur');
  }
}
