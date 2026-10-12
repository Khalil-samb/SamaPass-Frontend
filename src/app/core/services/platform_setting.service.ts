import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

const BASE_URL = `${environment.apiUrl}/api/settings`;

// Une ligne de l'historique : qui a changé le taux, quand, de combien à combien.
export interface ChangementTaux {
  oldRate: number;
  newRate: number;
  changedByName: string | null;
  changedAt: string;
}

// Les réglages de la plateforme tels que Django les renvoie (clés déjà en camelCase).
export interface ReglagesPlateforme {
  commissionRate: number; // en %
  updatedAt: string;
  updatedByName: string | null;
  history: ChangementTaux[];
}

@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  constructor(private http: HttpClient) {}

  // Réservé à l'admin
  getReglages(): Observable<ReglagesPlateforme> {
    return this.http.get<ReglagesPlateforme>(`${BASE_URL}/`);
  }

  // Réservé à l'admin, et exige son mot de passe actuel : ce taux est l'argent de la plateforme
  modifierTaux(commissionRate: number, currentPassword: string): Observable<ReglagesPlateforme> {
    return this.http.patch<ReglagesPlateforme>(`${BASE_URL}/`, { commissionRate, currentPassword });
  }

  // Public : le taux est une information publique (annoncée sur la page d'inscription des organisateurs)
  getTauxPublic(): Observable<{ commissionRate: number }> {
    return this.http.get<{ commissionRate: number }>(`${BASE_URL}/public/`);
  }
}
