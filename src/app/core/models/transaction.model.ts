export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'card';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded';

// Distinguer le paiement de billet, dun paiement de sponsorisation
export type TransactionType = 'ticket_purchase' | 'sponsored_ad';


export interface Transaction {
  id: string;
  userId: string;
  eventId: string;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  reference: string; // référence externe de l'opérateur de paiement
  createdAt: string
}
