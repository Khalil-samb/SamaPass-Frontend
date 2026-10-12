import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PaymentMethod } from '../../../core/models/transaction.model';
import { TicketsService } from '../../../core/services/tickets.service';
import { AuthStore } from '../../../core/state/auth.store';

interface OptionPaiement {
  valeur: PaymentMethod;
  label: string;
}

@Component({
  standalone: true,
  imports: [],
  selector: 'app-ticket-purchase-panel-component',
  styleUrl: './ticket-purchase-panel-component.css',
  templateUrl: './ticket-purchase-panel-component.html',
})
export class TicketPurchasePanelComponent {
  @Input({ required: true }) eventId!: string;
  @Input({ required: true }) eventTitle!: string;
  @Input({ required: true }) ticketTypeId!: string;
  @Input({ required: true }) ticketTypeName!: string;
  @Input({ required: true }) unitPrice!: number;
  @Input({ required: true }) quantity!: number;

  @Output() closed = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<{ ticketIds: string[] }>();

  etape = signal<'choix-paiement' | 'echec'>('choix-paiement');
  methodeChoisie = signal<PaymentMethod | null>(null);
  traitementEnCours = signal(false);
  erreur = signal<string | null>(null);

  optionsPaiement: OptionPaiement[] = [
    { valeur: 'wave', label: 'Wave' },
    { valeur: 'orange_money', label: 'Orange Money' },
    { valeur: 'free_money', label: 'Free Money' },
    { valeur: 'card', label: 'Carte bancaire' },
  ];

  // ⚠️ PaymentService et TransactionsService ne sont plus nécessaires
  // ici : Django s'occupe du paiement (simulé pour l'instant), de la
  // transaction ET des billets en un seul appel.
  constructor(
    private ticketsService: TicketsService,
    private authStore: AuthStore
  ) {}

  get montantTotal(): number {
    return this.unitPrice * this.quantity;
  }

  // ⚠️ Réécriture complète : un seul appel réel à Django, qui fait le
  // travail que ce composant faisait à la main avant (simuler le
  // paiement, fabriquer la transaction, fabriquer chaque billet avec
  // un id/QR Code inventés).
  async confirmerLePaiement() {
    const methode = this.methodeChoisie();
    if (!methode) return;

    if (!this.authStore.currentUser()) {
      this.erreur.set('Une erreur est survenue avec votre identification. Veuillez réessayer.');
      return;
    }

    this.traitementEnCours.set(true);
    this.erreur.set(null);

    try {
      const resultat = await firstValueFrom(
        this.ticketsService.acheterBillet({
          ticketTypeId: this.ticketTypeId,
          paymentMethod: methode,
          quantite: this.quantity,
        })
      );

      this.traitementEnCours.set(false);
      this.paymentSuccess.emit({ ticketIds: resultat.billets.map((b: any) => b.id) });
    } catch (err: any) {
      this.traitementEnCours.set(false);
      // 402 = le paiement lui-même a échoué : écran « échec ». Toute autre
      // réponse (400 : billetterie fermée, plus de places, limite par achat...)
      // porte un message précis du serveur : on l'affiche tel quel.
      if (err?.status === 402) {
        this.etape.set('echec');
      } else {
        this.erreur.set(this.extraireMessage(err));
      }
    }
  }

  private extraireMessage(err: any): string {
    const corps = err?.error;
    if (corps && typeof corps === 'object') {
      if (typeof corps.erreur === 'string') return corps.erreur;
      if (typeof corps.detail === 'string') return corps.detail;
      const premier: any = Object.values(corps)[0];
      if (Array.isArray(premier) && typeof premier[0] === 'string') return premier[0];
      if (typeof premier === 'string') return premier;
    }
    return 'Impossible de finaliser l\'achat pour le moment. Veuillez réessayer.';
  }

  fermer() {
    this.closed.emit();
  }
}
