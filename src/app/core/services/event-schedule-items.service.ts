import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventScheduleItem } from '../models/event-schedule-item.model';

@Injectable({ providedIn: 'root' })
export class EventScheduleItemsService {
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<EventScheduleItem[]> {
    return this.http.get<EventScheduleItem[]>('mock-data/event-schedule-items.json');
  }
}
