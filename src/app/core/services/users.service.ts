import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private usersCache = signal<User[] | null>(null);

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    const dejaCharges = this.usersCache();
    if (dejaCharges) {
      return of(dejaCharges);
    }
    return this.http
      .get<User[]>('mock-data/users.json')
      .pipe(tap((users) => this.usersCache.set(users)));
  }
}
