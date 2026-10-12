



import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { Transaction } from '../models/transaction.model';

const BASE_URL = `${environment.apiUrl}/api/transactions`;

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  constructor(private http: HttpClient) {}

  // Organisateur : toutes MES transactions (tous mes événements)
  toutesLesTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${BASE_URL}/organizers/me/`);
  }

  // Organisateur : transactions d'UN événement précis
  parEvenement(eventId: string): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${BASE_URL}/organizers/me/events/${eventId}/`);
  }

  // Admin : TOUTES les transactions de la plateforme
  toutesPourAdmin(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${BASE_URL}/admin/all/`);
  }

  // N'importe quel utilisateur connecté : SA PROPRE transaction (page de
  // confirmation d'achat)
  getById(transactionId: string): Observable<Transaction> {
    return this.http.get<Transaction>(`${BASE_URL}/${transactionId}/`);
  }
}

