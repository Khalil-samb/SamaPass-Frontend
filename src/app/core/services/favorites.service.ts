import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

const BASE_URL = `${environment.apiUrl}/api/engagement/favorites`;

export interface Favorite {
  id: string;
  event: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favorisParUtilisateur = new Map<string, string[]>();

  constructor(private http: HttpClient) {}

  // ⚠️ Changement de philosophie important : avant, les favoris étaient
  // stockés dans le navigateur (localStorage), donc jamais partagés
  // entre appareils. Maintenant qu'il y a un vrai compte utilisateur
  // avec jeton JWT, on les stocke réellement côté serveur — visibles
  // peu importe l'appareil utilisé pour se connecter.
  getMesFavoris(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(`${BASE_URL}/`);
  }

  ajouter(eventId: string): Observable<Favorite> {
    return this.http.post<Favorite>(`${BASE_URL}/${eventId}/`, {});
  }

  retirer(eventId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${eventId}/`);
  }

  // Compatibilité avec le code legacy qui utilisait un stockage local par utilisateur.
  obtenirFavoris(userId: string): string[] {
    return this.favorisParUtilisateur.get(userId) ?? [];
  }

  toggleFavori(userId: string, eventId: string): string[] {
    const favoris = new Set(this.obtenirFavoris(userId));
    if (favoris.has(eventId)) {
      favoris.delete(eventId);
    } else {
      favoris.add(eventId);
    }

    const resultat = [...favoris];
    this.favorisParUtilisateur.set(userId, resultat);
    return resultat;
  }
}
