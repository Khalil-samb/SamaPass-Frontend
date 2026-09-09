export type AdminActivityType = 'new_event' | 'new_organizer' | 'account_suspended' | 'account_reativated';

//Alimente la page "journal d'activité et Alerte " de lespace admin

export interface AdminActivityLop {
  id: string;
  type: AdminActivityLop;
  message: string;
  rrelatedEventId?: string;
  relatedOrganizerId?: string;
  relatedUserId?: string;
  createdAt: string;
}
