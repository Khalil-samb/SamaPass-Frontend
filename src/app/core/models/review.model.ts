export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  rating: number;      // 1 à 5
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}
