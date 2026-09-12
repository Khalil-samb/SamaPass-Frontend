//une ligne du programme d'un événement

export interface EventScheduleItem {
  id: string;
  eventId: string;
  time: string;
  title: string;
  description?: string;
  imageUrl?: string;   // optionnel : photo si l'étape représente un artiste/intervenant
  order: number;
}
