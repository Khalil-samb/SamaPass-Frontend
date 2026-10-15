
import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { EventsService } from '../../../core/services/events.service';
import { CategoriesService } from '../../../core/services/categories.service';

import { EventEntity, Category, City } from '../../../core/models';
import { CitiesService } from '../../../core/services/cities.service';
import { VillePrefereeStore } from '../../../core/state/ville-preferee.store';
import { AuthStore } from '../../../core/state/auth.store';
import { villeLaPlusProche } from '../../../shared/utils/villes-senegal.util';

import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';
import {
  DiapositiveHero,
  HeroCarouselComponent,
} from '../../../shared/ui/hero-carousel-component/hero-carousel-component';

import { PaymentLogoComponent } from '../../../shared/ui/payment-logo-component/payment-logo-component';
import {
  PolaroidLineCarouselComponent,
  SlidePassee,
} from '../../../shared/ui/polaroid-line-carousel-component/polaroid-line-carousel-component';


@Component({
  imports: [RouterLink, CardEventComponent, IconComponent, FormsModule, HeroCarouselComponent, PaymentLogoComponent, PolaroidLineCarouselComponent],
  selector: 'app-home-component',
  styleUrl: './home-component.css',
  templateUrl: './home-component.html',
})
export class HomeComponent implements OnInit {
  loading = signal(true);

  categories = signal<Category[]>([]);
  categorieFiltre = signal('');

  villes = signal<City[]>([]);
  positionEnCours = signal(false);
  messagePosition = signal('');

  // Les deux listes déroulantes du bloc de recherche filtrent la liste des événements EN DIRECT
  // (même source que les boutons de catégorie plus bas). « Rechercher » mène à la page complète.
  periodeFiltre = signal('');

  get dateChoisie() { return this.periodeFiltre(); }
  set dateChoisie(valeur: string) { this.periodeFiltre.set(valeur ?? '');
    this.defilerVersLesEvenements(); }
  get categorieChoisie() { return this.categorieFiltre(); }
  set categorieChoisie(valeur: string) { this.categorieFiltre.set(valeur ?? '');
    this.defilerVersLesEvenements(); }

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
      .filter((e: any) => !this.estPasse(e))
      .filter((e: any) => this.categorieFiltre() === '' || e.categoryId === this.categorieFiltre())
      .filter((e: any) => this.dansLaPeriode(new Date(e.startDate), this.periodeFiltre()))
      ;

    const ville = this.villeStore.villeId();
    const ordonnes = ville ? this.ordonnerParVille(filtres, ville) : filtres;
    return ordonnes.slice(0, 6).map((event: any) => {
      const carte = construireCarteEvenement(event);
      if (ville && event.cityId === ville && !carte.disabled && !carte.badges.some((b) => b.text === 'À la une')) {
        carte.badges.push({ text: 'Près de vous', variant: 'official' });
      }
      return carte;
    });
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
      const joursAvantSamedi = jour === 0 ? -1 : 6 - jour; // dimanche : le week-end en cours a commencé hier
      const samedi = new Date(debutJour);
      samedi.setDate(samedi.getDate() + joursAvantSamedi);
      const finDimanche = new Date(samedi);
      finDimanche.setDate(finDimanche.getDate() + 1);
      finDimanche.setHours(23, 59, 59);
      return dateEvenement >= (jour === 0 ? debutJour : samedi) && dateEvenement <= finDimanche;
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

  // Sponsorisés partout d'abord, puis la ville choisie, puis le reste ; les événements terminés restent en dernier.
  // L'ordre d'origine (par date) est conservé à l'intérieur de chaque groupe.
  private ordonnerParVille(liste: any[], ville: string): any[] {
    const rang = (e: any) => {
      if (e.salesState === 'ended' || e.status === 'finished') return 3;
      if (e.isSponsored) return 0;
      return e.cityId === ville ? 1 : 2;
    };
    return liste
      .map((e, i) => ({ e, i }))
      .sort((a, b) => rang(a.e) - rang(b.e) || a.i - b.i)
      .map((x) => x.e);
  }

  // Invitation affichée une seule fois, à la première connexion : la personne décide
  // (et le navigateur lui demande ensuite lui-même son accord).
  afficherInvitation = computed(
    () => !!this.authStore.currentUser() && !this.villeStore.villeId() && !this.villeStore.dejaDemandee()
  );

  accepterLocalisation() {
    this.villeStore.marquerDemandee();
    this.utiliserMaPosition();
  }

  refuserLocalisation() {
    this.villeStore.marquerDemandee();
    this.messagePosition.set('Choisissez votre ville dans la liste.');
  }

  choisirVille(id: string) {
    this.villeStore.choisir(id ?? '');
    this.messagePosition.set('');
  }

  utiliserMaPosition() {
    if (!navigator.geolocation) {
      this.messagePosition.set("La localisation n'est pas disponible sur cet appareil. Choisissez votre ville dans la liste.");
      return;
    }
    this.positionEnCours.set(true);
    this.messagePosition.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const proche = villeLaPlusProche(pos.coords.latitude, pos.coords.longitude, this.villes());
        this.positionEnCours.set(false);
        if (proche) {
          this.villeStore.choisir(proche.id);
          this.messagePosition.set(`Ville détectée : ${proche.name}`);
        } else {
          this.messagePosition.set("Aucune de nos villes n'est proche de vous. Choisissez-en une dans la liste.");
        }
      },
      () => {
        this.positionEnCours.set(false);
        this.messagePosition.set('Position refusée ou indisponible. Choisissez votre ville dans la liste.');
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  // Un événement dont la date est passée quitte la grille principale et rejoint « Événements passés »
  private estPasse(e: any): boolean {
    return e.salesState === 'ended' || e.status === 'finished';
  }

  evenementsPasses = computed<SlidePassee[]>(() =>
    this.allEvents()
      .filter((e: any) => this.estPasse(e))
      .sort((a: any, b: any) => new Date(b.endDate ?? b.startDate).getTime() - new Date(a.endDate ?? a.startDate).getTime())
      .slice(0, 12)
      .map((e: any) => ({
        id: e.id,
        image: e.coverImageUrl,
        title: e.title,
        caption:
          'Terminé le ' +
          new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(e.endDate ?? e.startDate)) +
          (e.venue ? ' · ' + e.venue : ''),
      }))
  );

  private defilerVersLesEvenements() {
    setTimeout(() => {
      document.getElementById('evenements-a-la-une')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  constructor(
    private eventsService: EventsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private citiesService: CitiesService,
    public villeStore: VillePrefereeStore,
    private authStore: AuthStore
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
    this.citiesService.getAll().subscribe((v) => this.villes.set(v ?? []));
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

