import { AccountStatus } from "./account-status-model";

export type UserRole = 'user' | 'organizer' | 'admin';

export interface User {
  id: string;
  phone: string;            //identifiant obligatoire pour la reception de l'OTP whatsapp
  phoneVerified: boolean;   // true une fois le code OPT valider
  firstName: string;
  lastName?:string;
  email?:string;
  passwordHash?:string;
  role: UserRole;
  status: AccountStatus; //permet a l'admin de superviser le status de l'utilisateur
  cityId?: string;
  avatarUrl?: string;
  createdAt: string;
}
