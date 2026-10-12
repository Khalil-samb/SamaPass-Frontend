import { OrganizerPaymentMethod } from './organizer.model';

// Une demande de reversement de l'argent dû à un organisateur.
// L'argent des acheteurs passe toujours par le compte SamaPass d'abord ;
// un Payout, c'est SamaPass qui envoie ensuite le montant net (après la commission de
// chaque vente, au taux du jour de l'achat) vers le compte mobile money de l'organisateur.
export type PayoutStatus = 'pending' | 'completed' | 'failed';

export interface Payout {
  id: string;
  // Django envoie « organizer » (l'identifiant de l'organisateur), PAS « organizerId » :
  // les clés étrangères gardent le nom du champ, sans suffixe « Id ». « organizerId » est
  // conservé, facultatif, pour ne pas casser le code qui l'importe encore.
  organizer?: string;
  organizerId?: string;
  amount: number;
  status: PayoutStatus;
  paymentMethod: OrganizerPaymentMethod;
  destinationAccount: string;
  reference: string;
  requestedAt: string;
  processedAt?: string;
}
