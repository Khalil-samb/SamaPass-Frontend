export type AdminActivityType = 'new_event' | 'new_organizer' | 'account_suspended' | 'account_reactivated';

// Alimente la page "journal d'activité et Alerte" de l'espace admin
export interface AdminActivityLog {
  id: string;
  type: AdminActivityType;
  message: string;
  rrelatedEventId?: string;
  relatedOrganizerId?: string;
  relatedUserId?: string;
  relatedEventId?: string;
  location?: string;
  jauge?: number;
  createdAt: string;
}
