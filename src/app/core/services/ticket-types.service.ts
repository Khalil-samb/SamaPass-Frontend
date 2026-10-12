import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments';

import { TicketType } from '../models/ticket-type.model';

const BASE_URL = `${environment.apiUrl}/api/events`;

@Injectable({ providedIn: 'root' })
export class TicketTypesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<TicketType[]> {
    return this.http.get<TicketType[]>('mock-data/ticket-types.json');
  }

  // Public : les catégories de billets d'un événement (fiche publique)
  getByEvent(eventId: string): Observable<TicketType[]> {
    return this.http.get<TicketType[]>('mock-data/ticket-types.json').pipe(
      map((types) => types.filter((type) => type.eventId === eventId))
    );
  }

  // Organisateur : liste des catégories de SON événement (avec quantitySold à jour)
  getMesCategories(eventId: string): Observable<TicketType[]> {
    return this.http.get<TicketType[]>(`${BASE_URL}/organizers/me/events/${eventId}/ticket-types/`);
  }

  // Organisateur : crée une nouvelle catégorie pour SON événement
  creerCategorie(eventId: string, donnees: Partial<TicketType>): Observable<TicketType> {
    return this.http.post<TicketType>(`${BASE_URL}/organizers/me/events/${eventId}/ticket-types/`, donnees);
  }

  // Organisateur : modifie une catégorie existante. Django refuse une quantité
  // totale inférieure au nombre de billets déjà vendus.
  modifierCategorie(eventId: string, typeId: string, donnees: Partial<TicketType>): Observable<TicketType> {
    return this.http.patch<TicketType>(`${BASE_URL}/organizers/me/events/${eventId}/ticket-types/${typeId}/`, donnees);
  }

  // Organisateur : supprime une catégorie. Django refuse si elle a déjà des ventes.
  supprimerCategorie(eventId: string, typeId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/organizers/me/events/${eventId}/ticket-types/${typeId}/`);
  }

  ajouterTicketType(donnees: Partial<TicketType>): Observable<TicketType> {
    return this.http.post<TicketType>(`${BASE_URL}/organizers/me/events/${donnees.eventId}/ticket-types/`, donnees);
  }
}
