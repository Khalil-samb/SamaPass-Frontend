import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Ticket } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  // On garde les billets en mémoire une fois chargés, pour ne pas re-télécharger
  // le fichier JSON à chaque fois, et pour pouvoir y ajouter de nouveaux billets
  // achetés pendant la session (en attendant le vrai backend).
  private ticketsCache = signal<Ticket[] | null>(null);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Ticket[]> {
    const dejaCharges = this.ticketsCache();
    if (dejaCharges) {
      return of(dejaCharges);
    }
    return this.http
      .get<Ticket[]>('mock-data/tickets.json')
      .pipe(tap((tickets) => this.ticketsCache.set(tickets)));
  }

  // Ajoute un ou plusieurs nouveaux billets (après un achat réussi).
  // Comme il n'y a pas encore de vrai backend, ça reste en mémoire pour la
  // durée de la session — recharger la page effacera ces billets. Normal
  // pour l'instant, ce sera un vrai enregistrement en base plus tard.
  ajouterBillets(nouveauxBillets: Ticket[]) {
    const actuels = this.ticketsCache() ?? [];
    this.ticketsCache.set([...actuels, ...nouveauxBillets]);
  }

  // Utile pour la page de confirmation, qui doit retrouver LE billet qu'on
  // vient de créer, sans refaire un appel réseau.
  getByIdDepuisLeCache(id: string): Ticket | undefined {
    return this.ticketsCache()?.find((t) => t.id === id);
  }
}
