import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { CitiesService } from '../../../core/services/cities.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';

import { EventEntiy } from '../../../core/models';
import { City } from '../../../core/models';
import { Category } from '../../../core/models';
import { TicketType } from '../../../core/models';


import { CardEventComponent, EventCardBadge, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { FormsModule } from '@angular/forms';


@Component({
  imports: [RouterLink, CardEventComponent, IconComponent, FormsModule],
  selector: 'app-home-component',
  styleUrl: './home-component.css',
  templateUrl: './home-component.html',
})
export class HomeComponent implements OnInit {
  loading = signal(true);

  categories = signal<Category[]>([]);
  categorieFiltre = signal('');

  dateChoisie = '';
  categorieChoisie = '';

  // Données brutes gardées en mémoire pour pouvoir refiltrer sans re-télécharger
  private allEvents = signal<EventEntiy[]>([]);
  private allTicketTypes = signal<TicketType[]>([]);
  private allCities = signal<City[]>([]);

  // Se recalcule automatiquement à chaque fois que allEvents ou categorieFiltre change
  eventsVM = computed<EventCardVM[]>(() => {
    const filtres = this.allEvents()
      .filter((e) => e.status === 'published' || e.status === 'sold_out')
      .filter((e) => this.categorieFiltre() === '' || e.categoryId === this.categorieFiltre())
      .slice(0, 6);

    return filtres.map((event) =>
      this.transformerEnCarteAffichable(event, this.allTicketTypes())
    );
  });

  constructor(
    private eventsService: EventsService,
    private citiesService: CitiesService,
    private categoriesService: CategoriesService,
    private ticketTypesService: TicketTypesService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      events: this.eventsService.getAll(),
      cities: this.citiesService.getAll(),
      categories: this.categoriesService.getAll(),
      ticketTypes: this.ticketTypesService.getAll(),
    }).subscribe({
      next: ({ events, cities, categories, ticketTypes }) => {
        this.allEvents.set(events ?? []);
        this.allCities.set(cities ?? []);
        this.categories.set(categories ?? []);
        this.allTicketTypes.set(ticketTypes ?? []);
        this.loading.set(false);
      },
      error: (erreur) => {
        console.error('Erreur lors du chargement des données de l\'accueil :', erreur);
        this.loading.set(false);
      },
    });
  }

  private transformerEnCarteAffichable(
    event: EventEntiy,
    ticketTypes: TicketType[]
  ): EventCardVM {
    const billetsDeCetEvenement = ticketTypes.filter((t) => t.eventId === event.id);
    const cityName = this.allCities().find((city) => city.id === event.cityId)?.name ?? 'Sénégal';

    // Le billet le moins cher détermine le prix ET le libellé affichés
    const billetLeMoinsCher = billetsDeCetEvenement.length
      ? billetsDeCetEvenement.reduce((moinsCher, t) => (t.price < moinsCher.price ? t : moinsCher))
      : null;

    const dateTimeLabel = this.formaterDateEtHeure(event.startDate);
    const ticketLabel = this.determinerLabelBillet(billetLeMoinsCher?.name ?? '');
    const priceLabel = billetLeMoinsCher ? `${billetLeMoinsCher.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit';

    const tauxRemplissage = billetsDeCetEvenement.length
      ? billetsDeCetEvenement.reduce((s, t) => s + t.quantitySold, 0) /
        billetsDeCetEvenement.reduce((s, t) => s + t.quantityTotal, 0)
      : 0;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.coverImageUrl,
      venue: event.venue,
      dateTimeLabel,
      ticketLabel,
      priceLabel,
      badges: this.construireBadges(event, tauxRemplissage),
    };
  }

  // "À la une" et "Dernières places" sont calculés automatiquement à partir des
  // données réelles. Les badges plus éditoriaux ("Prestige", "Gala VIP"...) vus
  // sur la maquette n'ont pas de règle évidente dans le modèle de données actuel
  // — on pourra ajouter un champ "tags" sur Event plus tard si besoin de ce
  // niveau de contrôle manuel.
  private construireBadges(event: EventEntiy, tauxRemplissage: number): EventCardBadge[] {
    const badges: EventCardBadge[] = [];
    if (event.isSponsored) badges.push({ text: 'À la une', variant: 'featured' });
    if (tauxRemplissage >= 0.85) badges.push({ text: 'Dernières places', variant: 'urgent' });
    return badges;
  }

  private formaterDateEtHeure(dateISO: string): string {
    const date = new Date(dateISO);
    const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
    const jourAvecMajuscule = jour.charAt(0).toUpperCase() + jour.slice(1);
    return `${jourAvecMajuscule} • ${heure}`;
  }

  private determinerLabelBillet(nomDuBillet: string): string {
    const nom = nomDuBillet.toLowerCase();
    if (nom.includes('vip')) return 'BILLET VIP';
    if (nom.includes('pass')) return 'PASS FESTIVAL';
    return 'PRIX DU BILLET';
  }

  lancerLaRecherche() {
    this.router.navigate(['/evenements'], {
      queryParams: {
        date: this.dateChoisie || null,
        categorie: this.categorieChoisie || null,
      },
    });
  }
}
