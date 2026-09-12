import { AccountStatus } from "./account-status-model";

export type OrganizerPaymentMethod = 'wave' | 'orange_money';

export interface Organizer {
  id: string;
  userId: string;                        // référence vers le compte User du responsable
  organizationName: string;              // nom légal de la structure
  registrationNumber?: string;           // NINEA / Registre de commerce (conseillé, pas obligatoire)
  categoryId: string;                    // catégorie principale d'événements
  description?: string;                  // programmation habituelle
  logoUrl?: string;

  paymentMethod: OrganizerPaymentMethod; // Wave ou Orange Money — le mode de reversement choisi
  mobileMoneyAccountNumber: string;      // numéro marchand associé
  mobileMoneyAccountHolder: string;      // titulaire officiel du compte

  receoitAlertesVente: boolean;          // alertes email/SMS à chaque vente

  status: AccountStatus;                 // 'active' | 'suspended' — pas de "pending", accès immédiat
  createdAt: string;
}
