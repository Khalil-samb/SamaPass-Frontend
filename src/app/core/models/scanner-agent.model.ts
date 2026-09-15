// Un membre de l'équipe terrain affecté à une porte, muni d'un code PIN
// pour s'authentifier sur l'application Flutter dédiée (application séparée,
// pas notre webapp Angular).
export type ScannerRole = 'operator' | 'supervisor' | 'disputes_manager';

export interface ScannerAgent {
  id: string;
  eventId: string;
  gateId: string;
  name: string;
  phone: string;
  role: ScannerRole;
  pinCode: string;      // code à 4 chiffres généré automatiquement, envoyé par WhatsApp
  createdAt: string;
}
