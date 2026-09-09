import { App } from './../../app';
export type NotificationType = 'event_reminder' | 'payment_confirmation' |
'new_event' | 'system';

// Notification personnelle reçue par un utilisateur ou un organisateur
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
