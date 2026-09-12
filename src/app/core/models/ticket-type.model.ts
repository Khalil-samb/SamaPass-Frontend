export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;   // ex: "Accès général au festival, zone debout"
  price: number;
  quantityTotal: number;
  quantitySold: number;
}
