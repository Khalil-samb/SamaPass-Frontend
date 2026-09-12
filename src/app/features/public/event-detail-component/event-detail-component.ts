import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { CitiesService } from '../../../core/services/cities.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { OrganizersService } from '../../../core/services/organizers.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { EventScheduleItemsService } from '../../../core/services/event-schedule-items.service';
import { PaymentService } from '../../../core/services/payment.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { AuthStore } from '../../../core/state/auth.store';

import { EventEntiy } from '../../../core/models/event.model';
import { City } from '../../../core/models/city.model';
import { Category } from '../../../core/models/category.model';
import { Organizer } from '../../../core/models/organizer.model';
import { TicketType } from '../../../core/models/ticket-type.model';
import { EventScheduleItem } from '../../../core/models/event-schedule-item.model';
import { Transaction, PaymentMethod } from '../../../core/models/transaction.model';
import { Ticket } from '../../../core/models/ticket.model';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { TicketPurchasePanelComponent } from '../ticket-purchase-panel-component/ticket-purchase-panel-component';


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
  standalone:true,
  selector: 'app-event-detail-component',
  styleUrl: './event-detail-component.css',
  templateUrl: './event-detail-component.html',
})

export class EventDetailComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);

  event = signal<EventEntiy | null>(null);
  cities = signal<City[]>([]);
  categories = signal<Category[]>([]);
  organizers = signal<Organizer[]>([]);
  ticketTypes = signal<TicketType[]>([]);
  scheduleItems = signal<EventScheduleItem[]>([]);

  ticketQuantities = signal<Record<string, number>>({});
  methodePaiement = signal<PaymentMethod | null>(null);
  telephoneReception = signal('');
  paiementEnCours = signal(false);
  erreurPaiement = signal<string | null>(null);

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

  peutPayer = computed(() =>
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
    private organizersService: OrganizersService,
    private ticketTypesService: TicketTypesService,
    private eventScheduleItemsService: EventScheduleItemsService,
    private paymentService: PaymentService,
    private transactionsService: TransactionsService,
    private ticketsService: TicketsService,
    private authStore: AuthStore
  ) {}

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');

    // Le numéro de téléphone est pré-rempli : l'utilisateur s'est déjà
    // identifié à la porte d'entrée de l'application.
    const utilisateur = this.authStore.currentUser();
    if (utilisateur) {
      this.telephoneReception.set(utilisateur.phone);
    }

    forkJoin({
      events: this.eventsService.getAll(),
      cities: this.citiesService.getAll(),
      categories: this.categoriesService.getAll(),
      organizers: this.organizersService.getAll(),
      ticketTypes: this.ticketTypesService.getAll(),
      scheduleItems: this.eventScheduleItemsService.getAll(),
    }).subscribe({
      next: ({ events, cities, categories, organizers, ticketTypes, scheduleItems }) => {
        this.event.set(events.find((e) => e.id === eventId) ?? null);
        this.cities.set(cities ?? []);
        this.categories.set(categories ?? []);
        this.organizers.set(organizers ?? []);
        this.ticketTypes.set((ticketTypes ?? []).filter((t) => t.eventId === eventId));
        this.scheduleItems.set(
          (scheduleItems ?? []).filter((s) => s.eventId === eventId).sort((a, b) => a.order - b.order)
        );
        this.loading.set(false);
      },
      error: (erreur) => {
        console.error("Erreur lors du chargement de l'événement :", erreur);
        this.loading.set(false);
      },
    });
  }

  quantiteDuType(ticketTypeId: string): number {
    return this.ticketQuantities()[ticketTypeId] ?? 0;
  }

  augmenterQuantite(type: TicketType) {
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

  async payerMaintenant() {
    const methode = this.methodePaiement();
    const lignes = this.lignesPanier();
    if (!methode || lignes.length === 0) return;

    this.paiementEnCours.set(true);
    this.erreurPaiement.set(null);

    const resultat = await this.paymentService.payer(this.montantTotal(), methode);
    this.paiementEnCours.set(false);

    if (!resultat.success) {
      this.erreurPaiement.set("Le paiement a échoué. Vérifiez votre solde ou réessayez.");
      return;
    }

    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) {
      this.erreurPaiement.set('Une erreur est survenue avec votre identification.');
      return;
    }

    const transactionId = `txn-${Date.now()}`;
    const transaction: Transaction = {
      id: transactionId,
      userId: utilisateur.id,
      eventId: this.event()!.id,
      type: 'ticket_purchase',
      amount: this.montantTotal(),
      paymentMethod: methode,
      status: 'success',
      reference: resultat.reference,
      createdAt: new Date().toISOString(),
    };
    this.transactionsService.ajouterTransaction(transaction);

    const nouveauxBillets: Ticket[] = [];
    lignes.forEach((ligne) => {
      for (let i = 0; i < ligne.quantity; i++) {
        nouveauxBillets.push({
          id: `tkt-${Date.now()}-${ligne.type.id}-${i}`,
          ticketTypeId: ligne.type.id,
          eventId: this.event()!.id,
          userId: utilisateur.id,
          transactionId,
          qrCode: `QR-${this.event()!.id}-${utilisateur.id}-${Date.now()}-${ligne.type.id}-${i}`,
          status: 'valid',
          price: ligne.type.price,
          purchaseDate: new Date().toISOString(),
          scannedAt: undefined,
        });
      }
    });
    this.ticketsService.ajouterBillets(nouveauxBillets);

    this.router.navigate(['/billet', nouveauxBillets[0].id, 'confirmation']);
  }
}
