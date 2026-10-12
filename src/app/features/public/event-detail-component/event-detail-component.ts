import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { CitiesService } from '../../../core/services/cities.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { SponsoredAdsService } from '../../../core/services/sponsored-ads.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthStore } from '../../../core/state/auth.store';

import { EventEntity } from '../../../core/models/event.model';
import { EventScheduleItem } from '../../../core/models/event-schedule-item.model';
import { City } from '../../../core/models/city.model';
import { Category } from '../../../core/models/category.model';
import { TicketType } from '../../../core/models/ticket-type.model';
import { PaymentMethod } from '../../../core/models/transaction.model';
import { SponsoredAd } from '../../../core/models/sponsored-ad.model';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

interface LignePanier {
  type: TicketType;
  quantity: number;
}

interface OptionPaiement {
  valeur: PaymentMethod;
  label: string;
}

@Component({
  imports: [IconComponent, RouterLink],
  standalone: true,
  selector: 'app-event-detail-component',
  styleUrl: './event-detail-component.css',
  templateUrl: './event-detail-component.html',
})
export class EventDetailComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  estFavori = signal(false);

  event = signal<EventEntity | null>(null);
  cities = signal<City[]>([]);
  categories = signal<Category[]>([]);

  // ⚠️ Ne vient plus d'un appel séparé : EventDetailSerializer (Django)
  // renvoie déjà les catégories de billets IMBRIQUÉES dans l'événement.
  ticketTypes = signal<TicketType[]>([]);
  scheduleItems = signal<EventScheduleItem[]>([]);

  ticketQuantities = signal<Record<string, number>>({});
  methodePaiement = signal<PaymentMethod | null>(null);
  telephoneReception = signal('');
  paiementEnCours = signal(false);
  erreurPaiement = signal<string | null>(null);

  publiciteActive = signal<SponsoredAd | null>(null);

  optionsPaiement: OptionPaiement[] = [
    { valeur: 'wave', label: 'Wave' },
    { valeur: 'orange_money', label: 'Orange Money' },
    { valeur: 'free_money', label: 'Free Money' },
    { valeur: 'card', label: 'Carte Bancaire' },
  ];

  lignesPanier = computed<LignePanier[]>(() =>
    this.ticketTypes()
      .map((type) => ({ type, quantity: this.ticketQuantities()[type.id] ?? 0 }))
      .filter((ligne) => ligne.quantity > 0)
  );

  montantTotal = computed(() =>
    this.lignesPanier().reduce((somme, ligne) => somme + ligne.type.price * ligne.quantity, 0)
  );

  // État des ventes décidé par le serveur (champ « salesState »).
  // Seul « open » permet d'acheter ; tout le reste désactive l'achat.
  etatVentes = computed<string>(() => (this.event() as any)?.salesState ?? 'open');
  venteOuverte = computed(() => this.etatVentes() === 'open');

  messageVentes = computed<string>(() => {
    switch (this.etatVentes()) {
      case 'ended': return 'Cet événement est terminé : la billetterie est fermée.';
      case 'sold_out': return 'Cet événement est complet.';
      case 'closed': return 'La billetterie est fermée pour cet événement.';
      case 'not_open': return "La billetterie n'est pas encore ouverte.";
      case 'unavailable': return "Cet événement n'est pas disponible à la vente.";
      default: return '';
    }
  });

  peutPayer = computed(() =>
    this.venteOuverte() &&
    this.lignesPanier().length > 0 && this.methodePaiement() !== null && this.telephoneReception().trim().length > 0
  );

  libelleBouton = computed(() => {
    const methode = this.optionsPaiement.find((o) => o.valeur === this.methodePaiement());
    return methode
      ? `Payer ${this.montantTotal().toLocaleString('fr-FR')} FCFA avec ${methode.label}`
      : 'Sélectionnez un moyen de paiement';
  });

  cityName = computed(() => this.cities().find((c) => c.id === this.event()?.cityId)?.name ?? '');
  categoryName = computed(() => this.categories().find((c) => c.id === this.event()?.categoryId)?.name ?? '');

  dateLabel = computed(() => {
    const ev = this.event();
    if (!ev) return '';
    const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ev.startDate));
    return jour.charAt(0).toUpperCase() + jour.slice(1);
  });

  heureLabel = computed(() => {
    const ev = this.event();
    if (!ev) return '';
    const debut = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ev.startDate));
    const fin = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ev.endDate));
    return `${debut} - ${fin}`;
  });

  urlDeLaCarte = computed<SafeResourceUrl>(() => {
    const ev = this.event();
    if (!ev) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const adresse = encodeURIComponent(`${ev.venue}, ${ev.address}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${adresse}&output=embed`);
  });

  urlItineraire = computed(() => {
    const ev = this.event();
    if (!ev) return '#';
    const adresse = encodeURIComponent(`${ev.venue}, ${ev.address}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${adresse}`;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private citiesService: CitiesService,
    private categoriesService: CategoriesService,
    private ticketsService: TicketsService,
    private sponsoredAdsService: SponsoredAdsService,
    private favoritesService: FavoritesService,
    private authStore: AuthStore
  ) {}

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) return;

    const utilisateur = this.authStore.currentUser();
    if (utilisateur) {
      this.telephoneReception.set(utilisateur.phone);
    }

    // ⚠️ getById (le détail complet d'UN SEUL événement), plus jamais
    // getAll() + find() — getAll() ne renvoie qu'une version allégée,
    // sans tous les champs dont cette page a besoin.
    this.eventsService.getById(eventId).subscribe({
      next: (ev) => {
        this.event.set(ev);
        this.ticketTypes.set(ev.ticketTypes ?? []);
        this.scheduleItems.set(ev.scheduleItems ?? []);
        this.loading.set(false);
      },
      error: (erreur) => {
        console.error("Erreur lors du chargement de l'événement :", erreur);
        this.loading.set(false);
      },
    });

    this.citiesService.getAll().subscribe((c) => this.cities.set(c ?? []));
    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));

    // ⚠️ Une campagne active renvoie une erreur 404 s'il n'y en a pas —
    // c'est un cas NORMAL ici, pas une vraie erreur à signaler.
    this.sponsoredAdsService.getCampagneActive(eventId).subscribe({
      next: (pub: SponsoredAd) => this.publiciteActive.set(pub),
      error: () => this.publiciteActive.set(null),
    });

    // ⚠️ Les favoris viennent maintenant du serveur (un vrai appel HTTP),
    // plus d'une vérification instantanée en mémoire — d'où le .subscribe().
    if (utilisateur) {
      this.favoritesService.getMesFavoris().subscribe((favoris) => {
        this.estFavori.set(favoris.some((f) => f.event === eventId));
      });
    }
  }

  quantiteDuType(ticketTypeId: string): number {
    return this.ticketQuantities()[ticketTypeId] ?? 0;
  }

  toggleFavori() {
    const eventId = this.event()?.id;
    if (!eventId) return;

    if (this.estFavori()) {
      this.favoritesService.retirer(eventId).subscribe(() => this.estFavori.set(false));
    } else {
      this.favoritesService.ajouter(eventId).subscribe(() => this.estFavori.set(true));
    }
  }

  augmenterQuantite(type: TicketType) {
    if (!this.venteOuverte()) return;
    const restant = type.quantityTotal - type.quantitySold;
    const actuelle = this.quantiteDuType(type.id);
    if (actuelle >= restant || actuelle >= 10) return;
    this.ticketQuantities.update((m) => ({ ...m, [type.id]: actuelle + 1 }));
  }

  diminuerQuantite(ticketTypeId: string) {
    const actuelle = this.quantiteDuType(ticketTypeId);
    if (actuelle <= 0) return;
    this.ticketQuantities.update((m) => ({ ...m, [ticketTypeId]: actuelle - 1 }));
  }

  partager() {
    if (navigator.share) {
      navigator.share({ title: this.event()?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  // ⚠️ Réécriture complète : avant, ce composant simulait le paiement
  // ET fabriquait lui-même la Transaction et les Ticket à la main.
  // Maintenant, Django fait TOUT ça — un appel par catégorie de billet
  // différente dans le panier (l'API n'accepte qu'un seul type à la fois).
  async payerMaintenant() {
    const methode = this.methodePaiement();
    const lignes = this.lignesPanier();
    if (!methode || lignes.length === 0) return;

    this.paiementEnCours.set(true);
    this.erreurPaiement.set(null);

    const tousLesBillets: { id: string }[] = [];

    try {
      for (const ligne of lignes) {
        const resultat = await firstValueFrom(
          this.ticketsService.acheterBillet({
            ticketTypeId: ligne.type.id,
            paymentMethod: methode,
            quantite: ligne.quantity,
          })
        );
        tousLesBillets.push(...resultat.billets);
      }

      this.paiementEnCours.set(false);
      this.router.navigate(['/billet', tousLesBillets[0].id, 'confirmation']);
    } catch (erreur: any) {
      this.paiementEnCours.set(false);
      this.erreurPaiement.set(
        erreur.error?.erreur ??
          (erreur.status === 402
            ? 'Le paiement a échoué. Vérifiez votre solde ou réessayez.'
            : "Impossible de finaliser l'achat pour le moment. Veuillez réessayer.")
      );
    }
  }
}
