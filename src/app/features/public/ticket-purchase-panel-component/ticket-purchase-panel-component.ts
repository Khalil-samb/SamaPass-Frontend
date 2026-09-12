import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { PaymentMethod, Transaction } from '../../../core/models/transaction.model';
import { Ticket } from '../../../core/models/ticket.model';
import { PaymentService } from '../../../core/services/payment.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { AuthStore } from '../../../core/state/auth.store';


interface OptionPaiement {
  valeur: PaymentMethod;
  label: string;
}


@Component({
  standalone:true,
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

  constructor(
    private paymentService: PaymentService,
    private transactionsService: TransactionsService,
    private ticketsService: TicketsService,
    private authStore: AuthStore
  ) {}

  get montantTotal(): number{
    return this.unitPrice * this.quantity;
  }

  async confirmerLePaiement(){
    const methode = this.methodeChoisie();
    if(!methode) return;

    this.traitementEnCours.set(true);
    this.erreur.set(null);

    const resultat = await this.paymentService.payer(this.montantTotal, methode);

    this.traitementEnCours.set(false);

    if(!resultat.success){
      this.etape.set('echec');
      return;
    }

    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) {
      this.erreur.set('Une erreur est survenue avec votre identification. Veuillez réessayer.');
      return;
    }


    // 1. On enregistre la transaction
    const transactionId = `txn-${Date.now()}`;
    const transaction: Transaction = {
      id: transactionId,
      userId: utilisateur.id,
      eventId: this.eventId,
      type: 'ticket_purchase',
      amount: this.montantTotal,
      paymentMethod: methode,
      status: 'success',
      reference: resultat.reference,
      createdAt: new Date().toISOString(),
    };
    this.transactionsService.ajouterTransaction(transaction);


   // 2. On génère un billet par unité achetée, chacun avec son propre QR Code
    const nouveauxBillets: Ticket[] = Array.from({ length: this.quantity }, (_, i) => ({
      id: `tkt-${Date.now()}-${i}`,
      ticketTypeId: this.ticketTypeId,
      eventId: this.eventId,
      userId: utilisateur.id,
      transactionId,
      qrCode: `QR-${this.eventId}-${utilisateur.id}-${Date.now()}-${i}`,
      status: 'valid',
      price: this.unitPrice,
      purchaseDate: new Date().toISOString(),
      scannedAt: undefined,
    }));
    this.ticketsService.ajouterBillets(nouveauxBillets);

    this.paymentSuccess.emit({ ticketIds: nouveauxBillets.map((t) => t.id) });
  }

  fermer(){
    this.closed.emit();
  }

}
