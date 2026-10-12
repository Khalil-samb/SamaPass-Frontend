import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { ReponseJaime, Video } from '../models/video.model';

const BASE_URL = `${environment.apiUrl}/api/videos`;

@Injectable({ providedIn: 'root' })
export class VideosService {
  constructor(private http: HttpClient) {}

  // ── Public ──
  // Le fil : événements sponsorisés d'abord, puis les plus récentes. Option : les vidéos d'un seul événement.
  getFil(eventId?: string): Observable<Video[]> {
    let params = new HttpParams();
    if (eventId) params = params.set('event', eventId);
    return this.http.get<Video[]>(`${BASE_URL}/`, { params });
  }

  // À appeler après quelques secondes de lecture (une seule fois par vidéo et par visite).
  compterUneVue(videoId: string): Observable<{ viewsCount: number }> {
    return this.http.post<{ viewsCount: number }>(`${BASE_URL}/${videoId}/view/`, {});
  }

  // Il faut être identifié (le serveur refuse sinon).
  aimer(videoId: string): Observable<ReponseJaime> {
    return this.http.post<ReponseJaime>(`${BASE_URL}/${videoId}/like/`, {});
  }

  nePlusAimer(videoId: string): Observable<ReponseJaime> {
    return this.http.delete<ReponseJaime>(`${BASE_URL}/${videoId}/like/`);
  }

  // ── Organisateur ──
  mesVideos(eventId?: string): Observable<Video[]> {
    let params = new HttpParams();
    if (eventId) params = params.set('event', eventId);
    return this.http.get<Video[]>(`${BASE_URL}/mine/`, { params });
  }

  // Renvoie tous les événements HTTP (et pas seulement la réponse finale) pour pouvoir afficher
  // la barre de progression pendant l'envoi d'un gros fichier.
  ajouter(eventId: string, titre: string, fichier: File): Observable<HttpEvent<Video>> {
    const corps = new FormData();
    corps.append('event', eventId);
    corps.append('title', titre);
    corps.append('file', fichier);
    return this.http.post<Video>(`${BASE_URL}/mine/`, corps, { reportProgress: true, observe: 'events' });
  }

  supprimer(videoId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/mine/${videoId}/`);
  }
}
