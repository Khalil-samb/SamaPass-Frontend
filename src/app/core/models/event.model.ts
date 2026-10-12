
import { EventScheduleItem } from './event-schedule-item.model';
import { TicketType } from './ticket-type.model';

export type EventStatus = 'draft' | 'published' | 'sold_out' | 'finished' | 'cancelled';
export type EventFeesBornBy = 'organizer' | 'buyer';

export interface EventEntity {
  id: string;
  organizer: string;
  title: string;
  subtitle?: string;
  description: string;
  categoryId: string;
  experienceFormat?: string;     // "Festival Plein Air", "Salle Couverte"... (liste fixe, pas une catégorie)
  cityId: string;
  venue: string;
  address: string;
  startDate: string;
  endDate: string;
  doorsOpenTime?: string;

  // Lieu précis
  latitude?: number;
  longitude?: number;

  // Médias
  coverImageUrl: string;
  bannerImageUrl?: string;       // bannière large 16:9, différente de l'affiche portrait
  galleryUrls: string[];
  teaserVideoUrl?: string;

  // Programmation
  lineup?: string[];             // têtes d'affiche : simples noms, pas d'horaire
                                  // (différent de EventScheduleItem, qui reste le programme détaillé)

  // Jauge et vente
  maxCapacity: number;           // jauge max déclarée (différente du total des TicketType)
  maxTicketsPerPurchase?: number;
  salesOpenAt?: string;          // vide = vente immédiate dès publication
  salesCloseAt?: string;
  feesBornBy: EventFeesBornBy;   // qui paie les 5% de commission
  acceptedPaymentMethods?: string[]; // moyens de paiement activés pour CET événement précis
  ticketTypes?: TicketType[];
  scheduleItems?: EventScheduleItem[];

  // Sécurité — ⚠️ enregistrés mais non fonctionnels sans backend + appli Flutter
  offlineModeEnabled: boolean;
  antiPassbackEnabled: boolean;
  allowTemporaryExits: boolean;

  status: EventStatus;
  isSponsored: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

