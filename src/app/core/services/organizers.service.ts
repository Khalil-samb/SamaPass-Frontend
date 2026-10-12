import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { Organizer } from '../models/organizer.model';


const BASE_URL_ADMIN = `${environment.apiUrl}/api/auth/admin`;
const BASE_URL_ORGANIZER = `${environment.apiUrl}/api/auth`;

@Injectable({ providedIn: 'root' })
export class OrganizersService {
  constructor(private http: HttpClient) {}

  // Admin uniquement : tous les organisateurs
  getAll(): Observable<Organizer[]> {
    return this.http.get<Organizer[]>(`${BASE_URL_ADMIN}/organizers/`);
  }

  // ⚠️ NOUVEAU — utilisé par SelectedEventStore : l'organisateur connecté
  // récupère SON PROPRE profil, pas la liste complète.
  getMonProfil(): Observable<Organizer> {
    return this.http.get<Organizer>(`${BASE_URL_ORGANIZER}/organizer/me/`);
  }

  ajouterOrganizer(donnees: Partial<Organizer>): Observable<Organizer> {
    return this.http.post<Organizer>(`${BASE_URL_ORGANIZER}/organizers/`, donnees);
  }

  mettreAJourOrganizer(id: string, updates: Partial<Organizer>): Observable<Organizer> {
    return this.http.patch<Organizer>(`${BASE_URL_ADMIN}/organizers/${id}/`, updates);
  }

  changerStatut(organizerId: string): Observable<{ id: string; status: string }> {
    return this.http.patch<{ id: string; status: string }>(`${BASE_URL_ADMIN}/organizers/${organizerId}/status/`, {});
  }
}
