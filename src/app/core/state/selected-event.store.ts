import { Injectable, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AuthStore } from './auth.store';
import { OrganizersService } from '../services/organizers.service';
import { EventsService } from '../services/events.service';
import { TransactionsService } from '../services/transactions.service';
import { PayoutsService } from '../services/payouts.service';

import { EventEntiy } from '../models/event.model';
import { Organizer } from '../models/organizer.model';

@Injectable({ providedIn: 'root' })
export class SelectedEventStore {
  // Tous les événements de l'organisateur connecté
  events = signal<EventEntiy[]>([]);

  // L'événement actuellement choisi dans le sélecteur (pilote la plupart des pages)
  selectedEventId = signal<string | null>(null);

  organizer = signal<Organizer | null>(null);
  loading = signal(true);

  // Le solde à reverser reste GLOBAL, tous événements confondus — contrairement
  // au reste de ce store qui tourne autour de l'événement sélectionné.
  soldeAReverser = signal(0);

  selectedEvent = computed(() => this.events().find((e) => e.id === this.selectedEventId()) ?? null);

  constructor(
    private authStore: AuthStore,
    private organizersService: OrganizersService,
    private eventsService: EventsService,
    private transactionsService: TransactionsService,
    private payoutsService: PayoutsService
  ) {}

  // Appelé une fois, depuis OrganizerLayoutComponent, à l'entrée dans l'espace organisateur.
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
      }).subscribe(({ events, transactions, payouts }) => {
        const mesEvenements = (events ?? []).filter((e) => e.organizerId === monOrganizer.id);
        this.events.set(mesEvenements);

        this.calculerSolde(monOrganizer.id, mesEvenements, transactions ?? [], payouts ?? []);

        // Sélectionne par défaut l'événement publié le plus récent, sinon le premier de la liste
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

  // ⚠️ Calcul simplifié pour l'instant : on suppose que les frais SamaPass (5%)
  // sont toujours à la charge de l'organisateur (Event.feesBornBy = 'organizer').
  // Le cas "frais à la charge de l'acheteur" sera affiné quand on codera la page
  // Reversements en détail — pour l'instant, cette carte de sidebar donne un
  // ordre de grandeur correct dans le cas le plus courant.
  private calculerSolde(
    organizerId: string,
    mesEvenements: EventEntiy[],
    transactions: { type: string; status: string; eventId: string; amount: number }[],
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
