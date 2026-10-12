import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { AdminActivityLog } from '../models/admin-activity-log.model';

const BASE_URL = `${environment.apiUrl}/api/admin-activity`;

export interface DashboardAdmin {
  nombreUtilisateurs: number;
  nombreOrganisateurs: number;
  evenementsEnCours: number;
  commissionTotale: number;
}

@Injectable({ providedIn: 'root' })
export class AdminActivityLogService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminActivityLog[]> {
    return this.http.get<AdminActivityLog[]>(`${BASE_URL}/log/`);
  }

  ajouterEntree(donnees: Partial<AdminActivityLog>): Observable<AdminActivityLog> {
    return this.http.post<AdminActivityLog>(`${BASE_URL}/log/`, donnees);
  }

  getDashboard(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(`${BASE_URL}/dashboard/`);
  }
}
