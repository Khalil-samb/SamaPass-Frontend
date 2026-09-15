import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { UsersService } from '../../../core/services/users.service';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { BadgeStatusComponent } from '../../../shared/ui/badge-status-component/badge-status-component';


interface PointVente {
  jour: string;
  montant: number;
}

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
  imports: [RouterLink, SlicePipe, IconComponent, BadgeStatusComponent],
  standalone:true,
  selector: 'app-organizer-dashboard-component',
  styleUrl: './organizer-dashboard-component.css',
  templateUrl: './organizer-dashboard-component.html',
})
export class OrganizerDashboardComponent {
  constructor(
    public eventStore: SelectedEventStore,
    private usersService: UsersService
  ) {}

  evenement = computed(() => this.eventStore.selectedEvent());

  private transactionsReussies = computed(() =>
    this.eventStore.transactionsEvenementSelectionne().filter((t) => t.status === 'success')
  );

  recettesBrutes = computed(() => this.transactionsReussies().reduce((somme, t) => somme + t.amount, 0));

  billetsVendus = computed(() => this.eventStore.ticketsEvenementSelectionne().length);

  jaugeTotale = computed(
    () =>
      this.evenement()?.maxCapacity ??
      this.eventStore.ticketTypesEvenementSelectionne().reduce((s, t) => s + t.quantityTotal, 0)
  );

  tauxRemplissage = computed(() => (this.jaugeTotale() > 0 ? (this.billetsVendus() / this.jaugeTotale()) * 100 : 0));

  panierMoyen = computed(() => {
    const nb = this.transactionsReussies().length;
    return nb > 0 ? Math.round(this.recettesBrutes() / nb) : 0;
  });

  // ⚠️ Suppose feesBornBy = 'organizer' — voir la note dans SelectedEventStore
  soldeGenereParEvenement = computed(() => Math.round(this.recettesBrutes() * 0.95));

  ventesParJour = computed<PointVente[]>(() => {
    const parJour = new Map<string, number>();
    this.transactionsReussies().forEach((t) => {
      const jour = t.createdAt.slice(0, 10);
      parJour.set(jour, (parJour.get(jour) ?? 0) + t.amount);
    });
    return Array.from(parJour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jour, montant]) => ({ jour, montant }));
  });

  venteMaxJour = computed(() => Math.max(1, ...this.ventesParJour().map((p) => p.montant)));

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

    this.usersService.getAll().subscribe((users) => {
      const typesById = new Map(this.eventStore.ticketTypesEvenementSelectionne().map((t) => [t.id, t]));

      const lignes = ["Titulaire,Téléphone,Catégorie,Prix,Statut,Date d'achat"];
      this.eventStore.ticketsEvenementSelectionne().forEach((ticket) => {
        const utilisateur = users.find((u) => u.id === ticket.userId);
        const type = typesById.get(ticket.ticketTypeId);
        lignes.push(
          [
            `${utilisateur?.firstName ?? ''} ${utilisateur?.lastName ?? ''}`.trim(),
            utilisateur?.phone ?? '',
            type?.name ?? '',
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
    });
  }
}
