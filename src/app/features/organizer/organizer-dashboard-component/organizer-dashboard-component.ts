import { Component, computed, effect, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { TicketsService } from '../../../core/services/tickets.service';
import { TransactionsService } from '../../../core/services/transactions.service';

import { Ticket } from '../../../core/models/ticket.model';
import { Transaction, partOrganisateurDe } from '../../../core/models/transaction.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { BadgeStatusComponent } from '../../../shared/ui/badge-status-component/badge-status-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { EvolutionChartComponent, SerieGraphique } from '../../../shared/ui/evolution-chart-component/evolution-chart-component';

interface CanalEncaissement {
  methode: string;
  label: string;
  pourcentage: number;
}

const LABEL_METHODE: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  card: 'Carte Bancaire',
};

@Component({
  selector: 'app-organizer-dashboard-component',
  standalone: true,
  imports: [RouterLink, IconComponent, BadgeStatusComponent, DecimalPipe, EvolutionChartComponent, RevealDirective],
  templateUrl: './organizer-dashboard-component.html',
})
export class OrganizerDashboardComponent implements OnDestroy {
  tickets = signal<Ticket[]>([]);
  transactions = signal<Transaction[]>([]);

  constructor(
    public eventStore: SelectedEventStore,
    private ticketsService: TicketsService,
    private transactionsService: TransactionsService
  ) {
    // ⚠️ effect() au lieu de ngOnInit : ngOnInit ne s'exécute qu'UNE fois. Si la
    // page est ouverte (ou rechargée avec F5) avant que le store ait fini de
    // charger, l'identifiant de l'événement est encore vide à ce moment-là et
    // les chiffres restaient à zéro pour toujours. Ici, dès que l'événement
    // sélectionné apparaît OU change, les données se rechargent.
    effect(() => {
      const eventId = this.eventStore.selectedEventId();
      // Se relance aussi quand les données du store ont VRAIMENT changé (une
      // vente, une modification...) : les chiffres se mettent à jour d'eux-mêmes.
      this.eventStore.versionDonnees();
      if (eventId) this.chargerDonnees(eventId);
    });

    // Chiffres à jour dès l'arrivée sur la page, puis automatiquement tant
    // qu'elle reste ouverte (voir SelectedEventStore.utiliser).
    this.eventStore.utiliser();
    void this.eventStore.rafraichir();
  }

  ngOnDestroy() {
    this.eventStore.liberer();
  }

  private chargerDonnees(eventId: string) {
    this.ticketsService.billetsDeEvenement(eventId).subscribe((t) => this.tickets.set(t ?? []));
    this.transactionsService.parEvenement(eventId).subscribe((t) => this.transactions.set(t ?? []));
  }

  evenement = computed(() => this.eventStore.selectedEvent());

  private transactionsReussies = computed(() => this.transactions().filter((t) => t.status === 'success'));

  recettesBrutes = computed(() => this.transactionsReussies().reduce((somme, t) => somme + t.amount, 0));

  billetsVendus = computed(() => this.tickets().length);

  jaugeTotale = computed(
    () => this.evenement()?.maxCapacity ?? (this.evenement()?.ticketTypes ?? []).reduce((s, t) => s + t.quantityTotal, 0)
  );

  tauxRemplissage = computed(() => (this.jaugeTotale() > 0 ? (this.billetsVendus() / this.jaugeTotale()) * 100 : 0));

  panierMoyen = computed(() => {
    const nb = this.transactionsReussies().length;
    return nb > 0 ? Math.round(this.recettesBrutes() / nb) : 0;
  });

  // Ce qui revient à l'organisateur : chaque vente de billet moins la commission figée le jour de
  // l'achat (même règle que le solde calculé par Django dans payouts/services.py).
  soldeGenereParEvenement = computed(() =>
    Math.round(this.transactionsReussies().reduce((somme, t) => somme + partOrganisateurDe(t), 0))
  );

  // Deux courbes, comme sur la maquette : les recettes et les billets vendus
  seriesGraphique = computed<SerieGraphique[]>(() => [
    {
      nom: 'Recettes',
      couleur: '#0f172a',
      unite: 'FCFA',
      points: this.transactionsReussies()
        .filter((t) => !!t.createdAt)
        .map((t) => ({ date: t.createdAt, valeur: t.amount })),
    },
    {
      nom: 'Billets vendus',
      couleur: '#ea580c',
      unite: 'billet(s)',
      points: this.tickets()
        .filter((t: any) => !!t.purchaseDate)
        .map((t: any) => ({ date: t.purchaseDate as string, valeur: 1 })),
    },
  ]);

  canauxEncaissement = computed<CanalEncaissement[]>(() => {
    const transactions = this.transactionsReussies();
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

  exporterCsv() {
    const ev = this.evenement();
    if (!ev) return;

    const lignes = ["Titulaire,Catégorie,Prix,Statut,Date d'achat"];
    this.tickets().forEach((ticket: any) => {
      lignes.push(
        [
          ticket.buyerName ?? '',
          ticket.ticketTypeName ?? '',
          ticket.price,
          ticket.status,
          new Date(ticket.purchaseDate).toLocaleDateString('fr-FR'),
        ].join(',')
      );
    });

    const blob = new Blob([lignes.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `participants-${ev.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }
}

