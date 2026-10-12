import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { Payout } from '../models/payout.model';

const BASE_URL = `${environment.apiUrl}/api/payouts`;

@Injectable({ providedIn: 'root' })
export class PayoutsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${BASE_URL}/`);
  }

  getSolde(): Observable<{ soldeDisponible: number }> {
    return this.http.get<{ soldeDisponible: number }>(`${BASE_URL}/solde/`);
  }

  getHistorique(): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${BASE_URL}/`);
  }

  ajouterPayout(payout: Partial<Payout>): Observable<Payout> {
    return this.http.post<Payout>(`${BASE_URL}/`, payout);
  }

  mettreAJourPayout(id: string, updates: Partial<Payout>): Observable<Payout> {
    return this.http.patch<Payout>(`${BASE_URL}/${id}/`, updates);
  }

  // Aucun montant à envoyer : Django recalcule toujours lui-même le
  // solde exact disponible, jamais confiance en une valeur du client.
  demanderVirement(): Observable<Payout> {
    return this.http.post<Payout>(`${BASE_URL}/demander/`, {});
  }

  toutesPourAdmin(): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${BASE_URL}/admin/all/`);
  }

}
