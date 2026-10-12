import { Component, computed, OnInit, signal } from '@angular/core';
import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { Category, City, EventEntity, TicketType } from '../../../core/models';
import { ActivatedRoute } from '@angular/router';
import { CitiesService } from '../../../core/services/cities.service';
import { EventsService } from '../../../core/services/events.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { forkJoin } from 'rxjs';
import { CriteresRecherche, SearchBarComponent } from '../../../shared/ui/search-bar-component/search-bar-component';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';


interface FiltrePeriode {
  valeur: string;
  label: string;
}
@Component({
  imports: [CardEventComponent, SearchBarComponent],
  standalone:true,
  selector: 'app-search-results-component',
  styleUrl: './search-results-component.css',
  templateUrl: './search-results-component.html',
})
export class SearchResultsComponent implements OnInit {
  loading = signal(true);

  allEvents = signal<EventEntity[]>([]);
  ticketTypes = signal<TicketType[]>([]);
  cities = signal<City[]>([]);
  categories = signal<Category[]>([]);

  motCle = signal('');
  cityId = signal('');
  categoryId = signal('');
  periode = signal('');

  filtresPeriode: FiltrePeriode[] = [
    { valeur: '', label: 'Toutes les dates' },
    { valeur: 'today', label: "Aujourd'hui" },
    { valeur: 'weekend', label: 'Ce week-end' },
    { valeur: 'week', label: 'Cette semaine' },
    { valeur: 'month', label: 'Ce mois-ci' },
  ];

  constructor(
    private route: ActivatedRoute,
    private eventsService: EventsService,
    private citiesService: CitiesService,
    private categoriesService: CategoriesService,
    private ticketTypesService: TicketTypesService
  ) {}

  ngOnInit() {
    // Reprend les critères déjà choisis sur l'accueil (recherche rapide ou carte de filtre)
    const parametres = this.route.snapshot.queryParamMap;
    this.motCle.set(parametres.get('q') ?? '');
    this.cityId.set(parametres.get('ville') ?? '');
    this.categoryId.set(parametres.get('categorie') ?? '');
    this.periode.set(parametres.get('date') ?? '');

    forkJoin({
      events: this.eventsService.getAll(),
      cities: this.citiesService.getAll(),
      categories: this.categoriesService.getAll(),
      ticketTypes: this.ticketTypesService.getAll(),
    }).subscribe(({ events, cities, categories, ticketTypes }) => {
      this.allEvents.set(events ?? []);
      this.cities.set(cities ?? []);
      this.categories.set(categories ?? []);
      this.ticketTypes.set(ticketTypes ?? []);
      this.loading.set(false);
    });
  }

  onRecherche(criteres: CriteresRecherche) {
    this.motCle.set(criteres.motCle);
    this.cityId.set(criteres.cityId);
    this.categoryId.set(criteres.categoryId);
  }

  resultats = computed<EventCardVM[]>(() => {
    const mot = this.motCle().toLowerCase().trim();

    const filtres = this.allEvents()
      .filter((e) => ['published', 'sold_out', 'finished'].includes(e.status))
      .filter((e) => !this.cityId() || e.cityId === this.cityId())
      .filter((e) => !this.categoryId() || e.categoryId === this.categoryId())
      .filter((e) => this.dansLaPeriode(new Date(e.startDate), this.periode()))
      .filter((e) => !mot || e.title.toLowerCase().includes(mot) || e.venue.toLowerCase().includes(mot));

    return filtres.map((e) => construireCarteEvenement(e));
  });

  private dansLaPeriode(dateEvenement: Date, periode: string): boolean {
    if (!periode) return true;

    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

    if (periode === 'today') {
      return dateEvenement.toDateString() === maintenant.toDateString();
    }

    if (periode === 'weekend') {
      const jour = maintenant.getDay(); // 0 = dimanche, 6 = samedi
      const joursAvantSamedi = (6 - jour + 7) % 7;
      const samedi = new Date(debutJour);
      samedi.setDate(samedi.getDate() + joursAvantSamedi);
      const finDimanche = new Date(samedi);
      finDimanche.setDate(finDimanche.getDate() + 1);
      finDimanche.setHours(23, 59, 59);
      return dateEvenement >= samedi && dateEvenement <= finDimanche;
    }

    if (periode === 'week') {
      const finSemaine = new Date(debutJour);
      finSemaine.setDate(finSemaine.getDate() + 7);
      return dateEvenement >= debutJour && dateEvenement <= finSemaine;
    }

    if (periode === 'month') {
      const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);
      return dateEvenement >= debutJour && dateEvenement <= finMois;
    }

    return true;
  }
}
