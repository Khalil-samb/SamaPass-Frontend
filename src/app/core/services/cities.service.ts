import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { City } from '../models/city.model';

@Injectable({ providedIn: 'root' })
export class CitiesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<City[]> {
    return this.http.get<City[]>('mock-data/cities.json');
  }
}
