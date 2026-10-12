import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

import { EventEntity } from '../models/event.model';

const BASE_URL = `${environment.apiUrl}/api/events`;

// Ce que renvoie VRAIMENT le catalogue public — volontairement léger,
// donc DIFFÉRENT d'un EventEntity complet. Pas les mêmes champs que le détail.
export interface EventCardApiResult {
  id: string;
  title: string;
  categoryId: string;
  cityId: string;
  venue: string;
  startDate: string;
  coverImageUrl: string;
  status: string;
  isSponsored: boolean;
  prixMin: number | null;
}

export interface FiltresCatalogue {
  ville?: string;
  categorie?: string;
  q?: string;
  date?: string;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private http: HttpClient) {}

  // ── Catalogue public (léger) ──
  getAll(filtres?: FiltresCatalogue): Observable<any[]> {
    let params = new HttpParams();
    if (filtres?.ville) params = params.set('ville', filtres.ville);
    if (filtres?.categorie) params = params.set('categorie', filtres.categorie);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.date) params = params.set('date', filtres.date);

    return this.http.get<any[]>(`${BASE_URL}/`, { params });
  }

  // ── Détail complet (public, mais tous les champs + billets imbriqués) ──
  getById(id: string): Observable<EventEntity> {
    return this.http.get<EventEntity>(`${BASE_URL}/${id}/`);
  }

  // ── Côté organisateur : ses propres événements, toutes les infos ──
  getMesEvenements(): Observable<EventEntity[]> {
    return this.http.get<EventEntity[]>(`${BASE_URL}/organizers/me/events/`);
  }

  // Un seul de SES événements. Contrairement à getById (public : n'importe qui
  // peut lire n'importe quelle fiche), cette route renvoie une erreur 404 si
  // l'événement n'appartient pas à l'organisateur connecté — c'est ce qu'il
  // faut pour la page de modification.
  getMonEvenement(id: string): Observable<EventEntity> {
    return this.http.get<EventEntity>(`${BASE_URL}/organizers/me/events/${id}/`);
  }

  ajouterEvenement(donnees: Partial<EventEntity>): Observable<EventEntity> {
    return this.http.post<EventEntity>(`${BASE_URL}/organizers/me/events/`, donnees);
  }

  creerEvenement(donnees: Partial<EventEntity>): Observable<EventEntity> {
    return this.ajouterEvenement(donnees);
  }

  modifierEvenement(id: string, donnees: Partial<EventEntity>): Observable<EventEntity> {
    return this.http.patch<EventEntity>(`${BASE_URL}/organizers/me/events/${id}/`, donnees);
  }

  mettreAJourEvenement(id: string, donnees: Partial<EventEntity>): Observable<EventEntity> {
    return this.http.patch<EventEntity>(`${BASE_URL}/${id}/`, donnees);
  }

  toutesPourAdmin(): Observable<EventEntity[]> {
    return this.http.get<EventEntity[]>(`${BASE_URL}/admin/all/`);
  }

}
