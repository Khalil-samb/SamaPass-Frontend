import { Injectable, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AuthStore } from './auth.store';
import { OrganizersService } from '../services/organizers.service';
import { EventsService } from '../services/events.service';
import { TransactionsService } from '../services/transactions.service';
import { PayoutsService } from '../services/payouts.service';
import { TicketTypesService } from '../services/ticket-types.service';
import { TicketsService } from '../services/tickets.service';

import { EventEntiy } from '../models/event.model';
import { Organizer } from '../models/organizer.model';
import { Transaction } from '../models/transaction.model';
import { TicketType } from '../models/ticket-type.model';
import { Ticket } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class SelectedEventStore {
  // Toutes les données de l'organisateur connecté, chargées une seule fois.
  // Les pages (Tableau de bord, Ventes, Scanner...) filtrent ensuite localement
  // par événement sélectionné, sans jamais re-télécharger quoi que ce soit.
  events = signal<EventEntiy[]>([]);
  allTransactions = signal<Transaction[]>([]);
  allTicketTypes = signal<TicketType[]>([]);
  allTickets = signal<Ticket[]>([]);

  selectedEventId = signal<string | null>(null);
  organizer = signal<Organizer | null>(null);
  loading = signal(true);

  // Reste global, tous événements confondus — voir SPEC_Organisateur_SamaPass.md
  soldeAReverser = signal(0);

  selectedEvent = computed(() => this.events().find((e) => e.id === this.selectedEventId()) ?? null);

  // Les 3 filtres les plus utiles, prêts à être réutilisés par n'importe quelle page organisateur
  ticketTypesEvenementSelectionne = computed(() =>
    this.allTicketTypes().filter((t) => t.eventId === this.selectedEventId())
  );
  transactionsEvenementSelectionne = computed(() =>
    this.allTransactions().filter((t) => t.eventId === this.selectedEventId() && t.type === 'ticket_purchase')
  );
  ticketsEvenementSelectionne = computed(() =>
    this.allTickets().filter((t) => t.eventId === this.selectedEventId())
  );

  constructor(
    private authStore: AuthStore,
    private organizersService: OrganizersService,
    private eventsService: EventsService,
    private transactionsService: TransactionsService,
    private payoutsService: PayoutsService,
    private ticketTypesService: TicketTypesService,
    private ticketsService: TicketsService
  ) {}

  charger() {
    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) {
      this.loading.set(false);
      return;
    }

    this.organizersService.getAll().subscribe((organizers) => {
      const monOrganizer = organizers.find((o) => o.userId === utilisateur.id) ?? null;
      this.organizer.set(monOrganizer);

      if (!monOrganizer) {
        this.loading.set(false);
        return;
      }

      forkJoin({
        events: this.eventsService.getAll(),
        transactions: this.transactionsService.getAll(),
        payouts: this.payoutsService.getAll(),
        ticketTypes: this.ticketTypesService.getAll(),
        tickets: this.ticketsService.getAll(),
      }).subscribe(({ events, transactions, payouts, ticketTypes, tickets }) => {
        const mesEvenements = (events ?? []).filter((e) => e.organizerId === monOrganizer.id);
        this.events.set(mesEvenements);
        this.allTransactions.set(transactions ?? []);
        this.allTicketTypes.set(ticketTypes ?? []);
        this.allTickets.set(tickets ?? []);

        this.calculerSolde(monOrganizer.id, mesEvenements, transactions ?? [], payouts ?? []);

        if (!this.selectedEventId() && mesEvenements.length > 0) {
          const enCours = mesEvenements.find((e) => e.status === 'published') ?? mesEvenements[0];
          this.selectedEventId.set(enCours.id);
        }

        this.loading.set(false);
      });
    });
  }

  selectionner(eventId: string) {
    this.selectedEventId.set(eventId);
  }

  private calculerSolde(
    organizerId: string,
    mesEvenements: EventEntiy[],
    transactions: Transaction[],
    payouts: { organizerId: string; status: string; amount: number }[]
  ) {
    const idsEvenements = new Set(mesEvenements.map((e) => e.id));

    const recettesBrutes = transactions
      .filter((t) => t.type === 'ticket_purchase' && t.status === 'success' && idsEvenements.has(t.eventId))
      .reduce((somme, t) => somme + t.amount, 0);

    const netDu = recettesBrutes * 0.95;

    const dejaVerse = payouts
      .filter((p) => p.organizerId === organizerId && p.status !== 'failed')
      .reduce((somme, p) => somme + p.amount, 0);

    this.soldeAReverser.set(Math.max(0, Math.round(netDu - dejaVerse)));
  }
}
