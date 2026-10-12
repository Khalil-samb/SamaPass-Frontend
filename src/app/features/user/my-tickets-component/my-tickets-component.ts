import { Component, computed, OnInit, signal } from '@angular/core';
import { EventEntity, Ticket } from '../../../core/models';
import { AuthStore } from '../../../core/state/auth.store';
import { TicketsService } from '../../../core/services/tickets.service';
import { EventsService } from '../../../core/services/events.service';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface LigneBillet {
  ticket: Ticket;
  event: EventEntity | undefined;
  categorieNom: string;
  aVenir: boolean;
}

type Filtre = 'tous' | 'avenir' | 'passes';

@Component({
  imports: [RouterLink, IconComponent, RevealDirective],
  selector: 'app-my-tickets-component',
  styleUrl: './my-tickets-component.css',
  templateUrl: './my-tickets-component.html',
})
export class MyTicketsComponent implements OnInit {
  loading = signal(true);
  tickets = signal<Ticket[]>([]);
  events = signal<EventEntity[]>([]);
  filtre = signal<Filtre>('tous');

  constructor(
    public authStore: AuthStore,
    private ticketsService: TicketsService,
    private eventsService: EventsService
  ) {}

  ngOnInit() {
    this.ticketsService.mesBillets().subscribe({
      next: (t) => {
        this.tickets.set(t ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.eventsService.getAll().subscribe((e) => this.events.set(e ?? []));
  }

  // Tous les billets, le PLUS RÉCEMMENT ACHETÉ EN PREMIER (toujours tout en haut), quel que soit le filtre.
  tousLesBillets = computed<LigneBillet[]>(() => {
    const maintenant = Date.now();
    const achat = (t: any) => new Date(t.purchaseDate).getTime() || 0;
    return this.tickets()
      .slice()
      .sort((a, b) => achat(b) - achat(a))
      .map((ticket: any) => {
        const event = this.events().find((e: any) => e.id === ticket.event);
        const fin = new Date(event?.endDate || event?.startDate || ticket.purchaseDate).getTime();
        return { ticket, event, categorieNom: ticket.ticketTypeName ?? '', aVenir: fin >= maintenant } as LigneBillet;
      });
  });

  nbAVenir = computed(() => this.tousLesBillets().filter((l) => l.aVenir && l.ticket.status === 'valid').length);
  nbPasses = computed(() => this.tousLesBillets().filter((l) => !l.aVenir).length);

  mesBillets = computed<LigneBillet[]>(() => {
    const f = this.filtre();
    const tous = this.tousLesBillets();
    if (f === 'avenir') return tous.filter((l) => l.aVenir);
    if (f === 'passes') return tous.filter((l) => !l.aVenir);
    return tous;
  });

  choisir(f: Filtre) {
    this.filtre.set(f);
  }

  libelleStatut(ligne: LigneBillet): string {
    switch (ligne.ticket.status) {
      case 'used':
        return 'Utilisé';
      case 'cancelled':
        return 'Annulé';
      default:
        return ligne.aVenir ? 'Valide' : 'Événement passé';
    }
  }

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateISO));
  }

  jour(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(new Date(dateISO));
  }

  mois(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(dateISO)).replace('.', '');
  }
}
