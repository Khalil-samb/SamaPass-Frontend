import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { AccessGate } from '../models/access-gate.model';

const BASE_URL = `${environment.apiUrl}/api/access-control`;

@Injectable({ providedIn: 'root' })
export class AccessGatesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<AccessGate[]> {
    return this.http.get<AccessGate[]>(`${BASE_URL}/gates/`);
  }

  getByEvent(eventId: string): Observable<AccessGate[]> {
    return this.http.get<AccessGate[]>(`${BASE_URL}/events/${eventId}/gates/`);
  }

  creerPorte(eventId: string, donnees: Partial<AccessGate>): Observable<AccessGate> {
    return this.http.post<AccessGate>(`${BASE_URL}/events/${eventId}/gates/`, donnees);
  }

  // Modification d'une porte existante (ex. : changer les catégories de
  // billets qu'elle accepte)
  modifierPorte(eventId: string, gateId: string, donnees: Partial<AccessGate>): Observable<AccessGate> {
    return this.http.patch<AccessGate>(`${BASE_URL}/events/${eventId}/gates/${gateId}/`, donnees);
  }

  // ⚠️ Supprime aussi les agents rattachés à cette porte (CASCADE côté Django)
  supprimerPorte(eventId: string, gateId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/events/${eventId}/gates/${gateId}/`);
  }

  ajouterAccessGate(donnees: Partial<AccessGate>): Observable<AccessGate> {
    return this.http.post<AccessGate>(`${BASE_URL}/events/${donnees.eventId}/gates/`, donnees);
  }
}
