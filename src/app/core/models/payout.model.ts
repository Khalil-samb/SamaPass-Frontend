import { OrganizerPaymentMethod } from './organizer.model';

// Une demande de reversement de l'argent dû à un organisateur.
// L'argent des acheteurs passe toujours par le compte SamaPass d'abord ;
// un Payout, c'est SamaPass qui envoie ensuite le montant net (après les 5%
// de commission) vers le compte mobile money de l'organisateur.
export type PayoutStatus = 'pending' | 'completed' | 'failed';

export interface Payout {
  id: string;
  organizerId: string;
  amount: number;
  status: PayoutStatus;
  paymentMethod: OrganizerPaymentMethod;
  destinationAccount: string;
  reference: string;
  requestedAt: string;
  processedAt?: string;
}
