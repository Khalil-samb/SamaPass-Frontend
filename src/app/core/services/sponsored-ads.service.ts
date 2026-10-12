import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { SponsoredAd } from '../models/sponsored-ad.model';

const BASE_URL = `${environment.apiUrl}/api/sponsorship`;

@Injectable({ providedIn: 'root' })
export class SponsoredAdsService {
  constructor(private http: HttpClient) {}

  // ⚠️ Retourne une erreur 404 s'il n'y a pas de campagne active — donc
  // à appeler avec un .subscribe({ next, error }) qui accepte ce cas,
  // pas comme un échec à afficher.
  getCampagneActive(eventId: string): Observable<SponsoredAd> {
    return this.http.get<SponsoredAd>(`${BASE_URL}/events/${eventId}/active/`);
  }

  // Une seule offre (15 000 FCFA, jusqu'à la fin de l'événement) : le prix est décidé par le serveur.
  acheterCampagne(eventId: string): Observable<SponsoredAd> {
    return this.http.post<SponsoredAd>(`${BASE_URL}/events/${eventId}/purchase/`, {});
  }
}
