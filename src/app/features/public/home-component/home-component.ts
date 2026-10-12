
import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { EventsService } from '../../../core/services/events.service';
import { CategoriesService } from '../../../core/services/categories.service';

import { EventEntity, Category } from '../../../core/models';

import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';
import {
  DiapositiveHero,
  HeroCarouselComponent,
} from '../../../shared/ui/hero-carousel-component/hero-carousel-component';

import { PaymentLogoComponent } from '../../../shared/ui/payment-logo-component/payment-logo-component';


@Component({
  imports: [RouterLink, CardEventComponent, IconComponent, FormsModule, HeroCarouselComponent, PaymentLogoComponent],
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

  private allEvents = signal<EventEntity[]>([]);

  // Les affiches qui défilent derrière le bloc d'accueil : uniquement les
  // événements réellement visibles du public (publiés ou complets) ET qui ont
  // une image. 6 au maximum, pour que le défilement reste court.
  diapositivesHero = computed<DiapositiveHero[]>(() =>
    this.allEvents()
      .filter((e: any) => (e.status === 'published' || e.status === 'sold_out') && !!e.coverImageUrl)
      .slice(0, 6)
      .map((e: any) => ({ id: e.id, imageUrl: e.coverImageUrl, titre: e.title }))
  );

  // Sert à passer le texte du bloc d'accueil en blanc SEULEMENT quand des
  // images sont affichées derrière (sans image, le fond clair d'origine reste).
  heroSurImages = computed(() => this.diapositivesHero().length > 0);



  eventsVM = computed<EventCardVM[]>(() => {
    const filtres = this.allEvents()
      .filter((e: any) => ['published', 'sold_out', 'finished'].includes(e.status))
      .filter((e: any) => this.categorieFiltre() === '' || e.categoryId === this.categorieFiltre())
      .slice(0, 6);

    return filtres.map((event: any) => construireCarteEvenement(event));
  });

  constructor(
    private eventsService: EventsService,
    private categoriesService: CategoriesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.eventsService.getAll().subscribe({
      next: (events) => {
        this.allEvents.set(events ?? []);
        this.loading.set(false);
      },
      error: (erreur) => {
        console.error("Erreur lors du chargement des événements de l'accueil :", erreur);
        this.loading.set(false);
      },
    });

    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));
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

