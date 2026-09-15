import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Payout } from '../models/payout.model';

@Injectable({ providedIn: 'root' })
export class PayoutsService {
  private payoutsCache = signal<Payout[] | null>(null);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Payout[]> {
    const dejaCharges = this.payoutsCache();
    if (dejaCharges) {
      return of(dejaCharges);
    }
    return this.http
      .get<Payout[]>('mock-data/payouts.json')
      .pipe(tap((payouts) => this.payoutsCache.set(payouts)));
  }

  ajouterPayout(nouveauPayout: Payout) {
    const actuels = this.payoutsCache() ?? [];
    this.payoutsCache.set([...actuels, nouveauPayout]);
  }
}
