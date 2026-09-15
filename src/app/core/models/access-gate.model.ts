// Une porte d'accès physique à un événement (ex. "Porte A — Entrée Principale Pelouse").
// Configurable à l'étape 3 de l'assistant de création, ou après publication.
export type AccessGateStatus = 'active' | 'inactive';

export interface AccessGate {
  id: string;
  eventId: string;
  name: string;                       // "Porte A"
  label: string;                      // "Entrée Principale Pelouse"
  allowedTicketTypeIds: string[];     // quelles catégories de billets passent par ici
  estimatedThroughputPerHour?: number;
  passageWidth?: string;
  status: AccessGateStatus;
}
