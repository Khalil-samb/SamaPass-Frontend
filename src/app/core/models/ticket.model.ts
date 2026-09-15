export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type TicketDisputeStatus = 'none' | 'flagged';

export interface Ticket {
  id: string;
  ticketTypeId: string;
  eventId: string;
  userId: string;
  transactionId: string;
  qrCode: string;
  status: TicketStatus;
  price: number;
  purchaseDate: string;
  scannedAt?: string;

  // Contrôle d'accès
  gateId?: string;              // quelle porte a scanné ce billet
  scannedByAgentId?: string;    // quel agent l'a scanné
  disputeStatus: TicketDisputeStatus;
}
