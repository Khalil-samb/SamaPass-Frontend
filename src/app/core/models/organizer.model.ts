import { AccountStatus } from "./account-status-model";

export interface Organizer {
  id: string;
  userId: string;
  organizationName: string;
  categoryId: string;
  description?: string;
  logoUrl?: string;
  contactPhone: string;
  mobileMoneyAccount: string;   //compte de reversement
  status: AccountStatus;
  createdAt: string;
}
