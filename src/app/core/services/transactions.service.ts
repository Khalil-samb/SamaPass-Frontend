import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private transactionsCache = signal<Transaction[] | null>(null);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Transaction[]> {
    const dejaChargees = this.transactionsCache();
    if (dejaChargees) {
      return of(dejaChargees);
    }
    return this.http
      .get<Transaction[]>('mock-data/transactions.json')
      .pipe(tap((transactions) => this.transactionsCache.set(transactions)));
  }

  ajouterTransaction(nouvelleTransaction: Transaction) {
    const actuelles = this.transactionsCache() ?? [];
    this.transactionsCache.set([...actuelles, nouvelleTransaction]);
  }
}
