export interface TicketType {
  id: string;
  eventId: string;
  name: string;   // ex: standard, vip
  price: number;
  quantityTotal: number;
  quantitySold: number;
}
