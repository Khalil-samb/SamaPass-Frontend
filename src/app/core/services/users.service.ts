import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { User } from '../models/user.model';

const BASE_URL = `${environment.apiUrl}/api/auth/admin`;

// ⚠️ Remplace entièrement l'ancien UsersService (qui lisait users.json).
// Il n'y a plus de "liste de tous les utilisateurs" accessible librement
// — seul l'admin peut la consulter, via cet endpoint protégé.
@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(`${BASE_URL}/users/`);
  }

  mettreAJourUtilisateur(id: string, updates: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${BASE_URL}/users/${id}/`, updates);
  }

  changerStatut(userId: string): Observable<User> {
    return this.http.patch<User>(`${BASE_URL}/users/${userId}/status/`, {});
  }
}
