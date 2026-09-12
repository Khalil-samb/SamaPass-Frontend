import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Organizer } from '../models/organizer.model';

@Injectable({ providedIn: 'root' })
export class OrganizersService {
  
  private organizersCache = signal<Organizer[] | null>(null);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Organizer[]> {
    const dejaCharges = this.organizersCache();
    if (dejaCharges){
      return of(dejaCharges);
    }
    return this.http
    .get<Organizer[]>('mock-data/organizers.json')
    .pipe(tap((organizers) => this.organizersCache.set(organizers)));
  }

  //Enregister un nouvel organisateur (apés validation du formulaire d'inscription).
  //Comme il y'a pas encore de vrai backend, ca reste en mémoire pour la session.
  ajouterOrganizer(nouvelOrganizer: Organizer){
    const actuels =this.organizersCache() ?? [];
    this.organizersCache.set([...actuels, nouvelOrganizer]);
  }
}
