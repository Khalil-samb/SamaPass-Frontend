
export type EventStatus = 'draft' | 'published' | 'sold_out' | 'finished' | 'cancelled';

export interface EventEntiy {
  id: string;
  organizedId: string;
  title: string;
  description: string;
  categoryId: string;
  cityId: string;
  venue: string;
  address: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  galleryUrls: string[];
  status: EventStatus;
  isSponsored: boolean; // mis à jour automatiquement 
  averageRating: number;
  reviewCount: number; //le nombre total d'avis sur un evenemnt
  createdAt: string;
}
