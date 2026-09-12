import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TicketsService } from '../../../core/services/tickets.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { EventsService } from '../../../core/services/events.service';
import { CitiesService } from '../../../core/services/cities.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { AuthStore } from '../../../core/state/auth.store';

import { Ticket } from '../../../core/models/ticket.model';
import { Transaction } from '../../../core/models/transaction.model';
import { EventEntiy } from '../../../core/models/event.model';
import { City } from '../../../core/models/city.model';
import { TicketType } from '../../../core/models/ticket-type.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';


interface LigneAchat {
  nom: string;
  quantite: number;
  prixUnitaire: number;
}

@Component({
  imports: [IconComponent, CardEventComponent],
  selector: 'app-ticket-confimation-component',
  styleUrl: './ticket-confimation-component.css',
  templateUrl: './ticket-confimation-component.html',
})
export class TicketConfirmationComponent implements OnInit {
  loading = signal(true);

  ticket = signal<Ticket | null>(null);
  transaction = signal<Transaction | null>(null);
  event = signal<EventEntiy | null>(null);
  cities = signal<City[]>([]);
  ticketTypesDeLEvenement = signal<TicketType[]>([]);
  ticketsMemeTransaction = signal<Ticket[]>([]);
  evenementsRecommandes = signal<EventCardVM[]>([]);

  nomProfil = signal('');
  telephoneProfil = signal('');
  profilEnregistre = signal(false);

  cityName = computed(() => this.cities().find((c) => c.id === this.event()?.cityId)?.name ?? '');

  nomTitulaire = computed(() => {
    const u = this.authStore.currentUser();
    return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : '';
  });

  lignesAchat = computed<LigneAchat[]>(() => {
    const types = this.ticketTypesDeLEvenement();
    const parType = new Map<string, number>();
    this.ticketsMemeTransaction().forEach((t) => {
      parType.set(t.ticketTypeId, (parType.get(t.ticketTypeId) ?? 0) + 1);
    });
    return Array.from(parType.entries()).map(([ticketTypeId, quantite]) => {
      const type = types.find((t) => t.id === ticketTypeId);
      return { nom: type?.name ?? 'Billet', quantite, prixUnitaire: type?.price ?? 0 };
    });
  });

  montantTotalLabel = computed(() => `${(this.transaction()?.amount ?? 0).toLocaleString('fr-FR')} FCFA`);

  idBilletFormate = computed(() => (this.ticket()?.id ?? '').toUpperCase().slice(0, 16));

  dateAchatLabel = computed(() => {
    const t = this.transaction();
    if (!t) return '';
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(t.createdAt));
  });

  dateEvenementLabel = computed(() => {
    const ev = this.event();
    if (!ev) return '';
    const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ev.startDate));
    return jour.charAt(0).toUpperCase() + jour.slice(1);
  });

  heureOuvertureLabel = computed(() => {
    const heure = this.event()?.doorsOpenTime;
    return heure ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(heure)) : '';
  });

  labelMoyenPaiement = computed(() => {
    const m = this.transaction()?.paymentMethod;
    const labels: Record<string, string> = { wave: 'Wave Pay', orange_money: 'Orange Money', free_money: 'Free Money', card: 'Carte Bancaire' };
    return m ? labels[m] : '';
  });

  urlQrCode = computed(() => {
    // Le QR reste volontairement FIXE (ticket.qrCode ne change jamais) : la
    // vraie protection vient du statut du billet (valid → used dès le premier
    // scan)
    const billet = this.ticket();
    if (!billet) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(billet.qrCode)}`;
  });

  urlItineraire = computed(() => {
    const ev = this.event();
    if (!ev) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ev.venue}, ${ev.address}`)}`;
  });

  lienWhatsApp = computed(() => {
    const ev = this.event();
    const texte = `Voici mon billet SamaPass pour ${ev?.title ?? "l'événement"} : ${window.location.href}`;
    return `https://wa.me/?text=${encodeURIComponent(texte)}`;
  });

  constructor(
    private route: ActivatedRoute,
    private ticketsService: TicketsService,
    private transactionsService: TransactionsService,
    private eventsService: EventsService,
    private citiesService: CitiesService,
    private ticketTypesService: TicketTypesService,
    private authStore: AuthStore
  ) {}

  ngOnInit() {
    const ticketId = this.route.snapshot.paramMap.get('ticketId');

    const utilisateur = this.authStore.currentUser();
    if (utilisateur) {
      this.nomProfil.set(utilisateur.firstName);
      this.telephoneProfil.set(utilisateur.phone);
    }

    forkJoin({
      tickets: this.ticketsService.getAll(),
      transactions: this.transactionsService.getAll(),
      events: this.eventsService.getAll(),
      cities: this.citiesService.getAll(),
      ticketTypes: this.ticketTypesService.getAll(),
    }).subscribe({
      next: ({ tickets, transactions, events, cities, ticketTypes }) => {
        const billet = tickets.find((t) => t.id === ticketId) ?? null;
        this.ticket.set(billet);
        this.cities.set(cities ?? []);

        if (billet) {
          const trans = transactions.find((t) => t.id === billet.transactionId) ?? null;
          this.transaction.set(trans);

          const ev = events.find((e) => e.id === billet.eventId) ?? null;
          this.event.set(ev);

          this.ticketTypesDeLEvenement.set((ticketTypes ?? []).filter((t) => t.eventId === billet.eventId));
          this.ticketsMemeTransaction.set(tickets.filter((t) => t.transactionId === billet.transactionId));

          if (ev) {
            this.evenementsRecommandes.set(
              (events ?? [])
                .filter((e) => e.id !== ev.id && e.cityId === ev.cityId && e.status === 'published')
                .slice(0, 3)
                .map((e) => construireCarteEvenement(e, ticketTypes ?? []))
            );
          }
        }

        this.loading.set(false);
      },
      error: (erreur) => {
        console.error('Erreur lors du chargement du billet :', erreur);
        this.loading.set(false);
      },
    });
  }

  imprimer() {
    window.print();
  }

  ajouterAuWallet() {
    alert('Ajout à Apple / Google Wallet : bientôt disponible.');
  }

  enregistrerProfil() {
    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) return;
    this.authStore.setIdentifiedUser({
      ...utilisateur,
      firstName: this.nomProfil(),
      phone: this.telephoneProfil(),
    });
    this.profilEnregistre.set(true);
    setTimeout(() => this.profilEnregistre.set(false), 2500);
  }
}
