import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

const BASE_URL = `${environment.apiUrl}/api/auth/organizer`;

// Le profil de l'organisateur connecté : l'organisation ET son responsable, à plat
// (clés déjà converties en camelCase par le serveur).
export interface ProfilOrganisateur {
  id: string;
  // Organisation
  organizationName: string;
  registrationNumber: string;
  categoryId: string;
  description: string;
  logoUrl: string;
  // Compte de reversement
  paymentMethod: 'wave' | 'orange_money';
  mobileMoneyAccountNumber: string;
  mobileMoneyAccountHolder: string;
  // Préférences
  receivesSaleAlerts: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  // Responsable du compte
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // lecture seule : sert à s'identifier
  cityId: string;
}

// Tout est facultatif : on n'envoie que ce qu'on veut modifier.
// currentPassword n'est exigé que pour l'email et le compte de reversement.
export interface MiseAJourProfil {
  organizationName?: string;
  registrationNumber?: string;
  categoryId?: string;
  description?: string;
  logoUrl?: string;
  firstName?: string;
  lastName?: string;
  cityId?: string;
  email?: string;
  paymentMethod?: 'wave' | 'orange_money';
  mobileMoneyAccountNumber?: string;
  mobileMoneyAccountHolder?: string;
  receivesSaleAlerts?: boolean;
  currentPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizerProfileService {
  constructor(private http: HttpClient) {}

  getProfil(): Observable<ProfilOrganisateur> {
    return this.http.get<ProfilOrganisateur>(`${BASE_URL}/profile/`);
  }

  modifierProfil(donnees: MiseAJourProfil): Observable<ProfilOrganisateur> {
    return this.http.patch<ProfilOrganisateur>(`${BASE_URL}/profile/`, donnees);
  }

  changerMotDePasse(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${BASE_URL}/change-password/`, { currentPassword, newPassword });
  }
}
