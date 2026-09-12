import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketType } from '../models/ticket-type.model';

@Injectable({ providedIn: 'root' })
export class TicketTypesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<TicketType[]> {
    return this.http.get<TicketType[]>('mock-data/ticket-types.json');
  }
}
