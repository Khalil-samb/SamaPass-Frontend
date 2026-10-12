import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { AppNotification } from '../models/notification.model';

// ⚠️ URL absolue via environment.apiUrl — jamais une URL relative
// ('/api/engagement/...'), sinon les appels partent vers Angular (port
// 4200) au lieu de Django.
const BASE_URL = `${environment.apiUrl}/api/engagement/notifications`;

// La réponse de /count/ : léger, prévu pour être interrogé toutes les 20 s
export interface ResumeNotifications {
  nonLues: number;
  derniere: string | null; // identifiant de la notification la plus récente
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${BASE_URL}/`);
  }

  compterNonLues(): Observable<ResumeNotifications> {
    return this.http.get<ResumeNotifications>(`${BASE_URL}/count/`);
  }

  marquerCommeLue(notificationId: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${BASE_URL}/${notificationId}/read/`, {});
  }

  toutMarquerCommeLu(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${BASE_URL}/read-all/`, {});
  }
}
