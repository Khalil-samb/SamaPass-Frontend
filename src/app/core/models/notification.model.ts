export type NotificationType =
  | 'event_reminder'
  | 'payment_confirmation'
  | 'new_event'
  | 'new_sale'
  | 'payout'
  | 'account'
  | 'new_organizer'
  | 'system';

// Notification personnelle reçue par un utilisateur, un organisateur ou un
// administrateur. Django ne renvoie déjà que les notifications de la
// personne connectée : userId n'est pas nécessaire pour filtrer côté
// frontend, mais reste présent si un composant en a besoin par ailleurs.
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
