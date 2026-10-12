import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { TicketsService } from '../../../core/services/tickets.service';
import { TransactionsService } from '../../../core/services/transactions.service';

import { Ticket } from '../../../core/models/ticket.model';
import { Transaction } from '../../../core/models/transaction.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

interface LigneVente {
  ticket: Ticket;
  acheteurNom: string;
  acheteurTelephone: string;
  categorieNom: string;
  statutLabel: string;
  statutCouleur: string;
}

const LABEL_METHODE: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  card: 'Carte Bancaire',
};

const TAILLE_PAGE = 6;

@Component({
  selector: 'app-event-sales-detail-component',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './event-sales-detail-component.html',
})
export class EventSalesDetailComponent implements OnInit {
  Math = Math;

  ticketsDeEvenement = signal<Ticket[]>([]);
  transactionsDeEvenement = signal<Transaction[]>([]);

  private rechercheSignal = signal('');
  private categorieFiltreSignal = signal('');
  private statutFiltreSignal = signal('');
  readonly taillePage = TAILLE_PAGE;
  readonly page = signal(1);

  get recherche(): string {
    return this.rechercheSignal();
  }
  set recherche(valeur: string) {
    this.rechercheSignal.set(valeur);
    this.page.set(1); // un nouveau filtre ramène à la première page
  }

  get categorieFiltre(): string {
    return this.categorieFiltreSignal();
  }
  set categorieFiltre(valeur: string) {
    this.categorieFiltreSignal.set(valeur);
    this.page.set(1);
  }

  get statutFiltre(): string {
    return this.statutFiltreSignal();
  }
  set statutFiltre(valeur: string) {
    this.statutFiltreSignal.set(valeur);
    this.page.set(1);
  }


  constructor(
    public eventStore: SelectedEventStore,
    private ticketsService: TicketsService,
    private transactionsService: TransactionsService
  ) {}

  ngOnInit() {
    const eventId = this.eventStore.selectedEventId();
    if (!eventId) return;

    this.ticketsService.billetsDeEvenement(eventId).subscribe((billets) => this.ticketsDeEvenement.set(billets));
    this.transactionsService.parEvenement(eventId).subscribe((transactions) => this.transactionsDeEvenement.set(transactions));
  }

  jaugeMax = computed(() => this.eventStore.selectedEvent()?.maxCapacity || 1);
  totalBillets = computed(() => this.ticketsDeEvenement().length);
  totalScannes = computed(() => this.ticketsDeEvenement().filter((t) => t.status === 'used').length);
  totalLitiges = computed(() => this.ticketsDeEvenement().filter((t: any) => t.disputeStatus === 'flagged').length);
  tauxScan = computed(() => (this.totalBillets() > 0 ? Math.round((this.totalScannes() / this.totalBillets()) * 100) : 0));

  recettesBrutes = computed(() =>
    this.transactionsDeEvenement().filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0)
  );

  canauxEncaissement = computed(() => {
    const transactions = this.transactionsDeEvenement().filter((t) => t.status === 'success');
    const total = transactions.length;
    if (total === 0) return [];
    const parMethode = new Map<string, number>();
    transactions.forEach((t) => parMethode.set(t.paymentMethod, (parMethode.get(t.paymentMethod) ?? 0) + 1));
    return Array.from(parMethode.entries()).map(([methode, count]) => ({
      methode,
      label: LABEL_METHODE[methode] ?? methode,
      pourcentage: Math.round((count / total) * 100),
    }));
  });

  private construireLigne(ticket: any): LigneVente {
    let statutLabel = 'Valide';
    let statutCouleur = 'bg-blue-100 text-blue-700';
    if (ticket.disputeStatus === 'flagged') {
      statutLabel = 'En litige';
      statutCouleur = 'bg-red-100 text-red-700';
    } else if (ticket.status === 'used') {
      statutLabel = 'Scanné';
      statutCouleur = 'bg-green-100 text-green-700';
    } else if (ticket.status === 'cancelled') {
      statutLabel = 'Annulé';
      statutCouleur = 'bg-slate-100 text-slate-500';
    }

    return {
      ticket,
      acheteurNom: ticket.buyerName ?? 'Inconnu',
      acheteurTelephone: ticket.buyerPhone ?? '',
      categorieNom: ticket.ticketTypeName ?? '',
      statutLabel,
      statutCouleur,
    };
  }

  lignesFiltrees = computed<LigneVente[]>(() => {
    const rechercheLower = this.recherche.trim().toLowerCase();

    return this.ticketsDeEvenement()
      .filter((t: any) => !this.categorieFiltre || t.ticketType === this.categorieFiltre)
      .filter((t) => {
        if (!this.statutFiltre) return true;
        if (this.statutFiltre === 'flagged') return (t as any).disputeStatus === 'flagged';
        return t.status === this.statutFiltre;
      })
      .map((t) => this.construireLigne(t))
      .filter(
        (ligne) =>
          !rechercheLower ||
          ligne.acheteurNom.toLowerCase().includes(rechercheLower) ||
          ligne.ticket.id.toLowerCase().includes(rechercheLower)
      );
  });

  nombreDePages = computed(() => Math.max(1, Math.ceil(this.lignesFiltrees().length / this.taillePage)));

  lignesPage = computed(() => {
    const debut = (this.page() - 1) * this.taillePage;
    return this.lignesFiltrees().slice(debut, debut + this.taillePage);
  });

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateISO));
  }
}
