import { Injectable, signal, computed } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { UsersService } from '../services/users.service';
import { OrganizersService } from '../services/organizers.service';
import { EventsService } from '../services/events.service';
import { TransactionsService } from '../services/transactions.service';
import { PayoutsService } from '../services/payouts.service';
import { TicketsService } from '../services/tickets.service';

import { User } from '../models/user.model';
import { Organizer } from '../models/organizer.model';
import { EventEntity } from '../models/event.model';
import { Transaction, commissionDe } from '../models/transaction.model';
import { Payout } from '../models/payout.model';
import { Ticket } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class AdminDataStore {
  users = signal<User[]>([]);
  organizers = signal<Organizer[]>([]);
  events = signal<EventEntity[]>([]);
  transactions = signal<Transaction[]>([]);
  payouts = signal<Payout[]>([]);
  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  constructor(
    private usersService: UsersService,
    private organizersService: OrganizersService,
    private eventsService: EventsService,
    private transactionsService: TransactionsService,
    private payoutsService: PayoutsService,
    private ticketsService: TicketsService
  ) {}

  //  Filet de sécurité : si UN appel échoue, on le signale dans la
  // console et on continue avec une liste vide, au lieu de faire échouer
  // le forkJoin entier (ce qui laissait toute l'interface bloquée sur
  // "Chargement..." pour toujours).
  private securiser<T>(nom: string, source: Observable<T[]>): Observable<T[]> {
    return source.pipe(
      catchError((erreur) => {
        console.error(`AdminDataStore : échec du chargement de "${nom}"`, erreur);
        return of([] as T[]);
      })
    );
  }

  charger() {
    this.loading.set(true);
    forkJoin({
      users: this.securiser('users', this.usersService.getAll()),
      organizers: this.securiser('organizers', this.organizersService.getAll()),
      //  Version admin : tous les événements, avec le champ "organizer"
      // (le catalogue public getAll() ne l'inclut pas).
      events: this.securiser('events', this.eventsService.toutesPourAdmin()),
      transactions: this.securiser('transactions', this.transactionsService.toutesPourAdmin()),
      payouts: this.securiser('payouts', this.payoutsService.toutesPourAdmin()),
      tickets: this.securiser('tickets', this.ticketsService.toutesPourAdmin()),
    }).subscribe(({ users, organizers, events, transactions, payouts, tickets }) => {
      this.users.set(users ?? []);
      this.organizers.set(organizers ?? []);
      this.events.set(events ?? []);
      this.transactions.set(transactions ?? []);
      this.payouts.set(payouts ?? []);
      this.tickets.set(tickets ?? []);
      this.loading.set(false);
    });
  }

  nombreUtilisateurs = computed(() => this.users().filter((u) => u.role ==='user').length);
  nombreOrganisateurs = computed(() => this.organizers().length);
  nombreEvenementsEnCours = computed(() => this.events().filter((e) => e.status === 'published').length);

  commissionTotale = computed(() => {
    const ventesReussies = this.transactions().filter((t) => t.type === 'ticket_purchase' && t.status === 'success');
    const pubsReussies = this.transactions().filter((t) => t.type === 'sponsored_ad' && t.status === 'success');
    // Chaque vente au taux figé le jour de son achat (voir platform_settings côté Django)
    const commissionVentes = ventesReussies.reduce((s, t) => s + commissionDe(t), 0);
    const revenuPubs = pubsReussies.reduce((s, t) => s + commissionDe(t), 0);
    return Math.round(commissionVentes + revenuPubs);
  });

  commissionParOrganizer(organizerId: string): number {
    const idsEvenements = new Set(this.events().filter((e) => e.organizer === organizerId).map((e) => e.id));
    //  t.event (pas t.eventId) : Django nomme ses clés étrangères par
    // le nom du champ tel quel, sans suffixe "Id".
    const ventes = this.transactions().filter(
      (t: any) => t.type === 'ticket_purchase' && t.status === 'success' &&idsEvenements.has(t.event)
    );
    return Math.round(ventes.reduce((s, t) => s + commissionDe(t), 0));
  }

  billetsAchetesPar(userId: string): number {
    //  t.user (pas t.userId), même raison.
    return this.tickets().filter((t: any) => t.user === userId).length;
  }
}
