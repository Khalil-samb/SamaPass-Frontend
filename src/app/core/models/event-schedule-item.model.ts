//une ligne du programme d'un événement

export interface EventScheduleItem {
  id: string;
  eventId: string;
  time: string;
  title: string;
  descripton?: string;
  order: number; //pour l'ordre d'affichage
}
