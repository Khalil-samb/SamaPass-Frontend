import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

import { Ticket } from '../models/ticket.model';

const BASE_URL = `${environment.apiUrl}/api/tickets`;

export interface DemandeAchat {
  ticketTypeId: string;
  paymentMethod: string;
  quantite: number;
}

export interface ResultatAchat {
  billets: Ticket[];
  reference: string;
}

export interface DemandeAchatInvite extends DemandeAchat {
  phone: string;
  firstName: string;
}

export interface DemandeScan {
  qrCode?: string;
  reference?: string;
  gateId?: string;
}

export interface ResultatScan {
  statut: 'valide' | 'doublon' | 'invalide';
  message: string;
  ticket?: Ticket;
  billet?: Ticket;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${BASE_URL}/`);
  }

  acheterBillet(demande: DemandeAchat): Observable<ResultatAchat> {
    return this.http.post<ResultatAchat>(`${BASE_URL}/purchase/`, demande);
  }

  ajouterBillets(billets: Ticket[]): Observable<Ticket[]> {
    return this.http.post<Ticket[]>(`${BASE_URL}/bulk/`, { billets });
  }

  mesBillets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${BASE_URL}/me/`);
  }

  // Côté organisateur : les billets vendus pour UN de ses événements
  billetsDeEvenement(eventId: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${BASE_URL}/organizers/me/events/${eventId}/tickets/`);
  }

  scannerBillet(demande: DemandeScan): Observable<ResultatScan> {
    return this.http.post<ResultatScan>(`${BASE_URL}/scan/`, demande);
  }

  signalerLitige(ticketId: string): Observable<{ message: string; billet: Ticket }> {
    return this.http.post<{ message: string; billet: Ticket }>(`${BASE_URL}/${ticketId}/dispute/`, {});
  }

  getById(ticketId: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${BASE_URL}/${ticketId}/`);
  }

  // Achat sans compte : pas de jeton, prénom + téléphone
  acheterBilletInvite(demande: DemandeAchatInvite): Observable<ResultatAchat> {
    return this.http.post<ResultatAchat>(`${BASE_URL}/purchase/guest/`, demande);
  }

  // Lecture publique d'un billet acheté sans compte
  getInvite(ticketId: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${BASE_URL}/invite/${ticketId}/`);
  }

  toutesPourAdmin(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${BASE_URL}/admin/all/`);
  }


}
