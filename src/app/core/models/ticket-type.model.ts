export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  perks?: string[];          // avantages listés en puces (ex. "Coupe-file", "1 boisson offerte")
  price: number;
  quantityTotal: number;
  quantitySold: number;
  isActive: boolean;         // badge "Actif" / catégorie désactivée temporairement
}
