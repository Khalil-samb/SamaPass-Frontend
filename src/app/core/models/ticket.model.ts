export type TicketStatus = 'valid' | 'used' | 'cancelled';

export interface Ticket {
  id: string;
  ticketTypeId: string;
  eventId: string;
  userId: string;
  transactionId: string;
  qrCode: string;
  status: TicketStatus;
  price: number;  // prix payé au moment de l'achat
  purchaseDate: string;
  scannedAt?: string;
}
