import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';
import { ScannerAgent } from '../models/scanner-agent.model';

const BASE_URL = `${environment.apiUrl}/api/access-control`;

@Injectable({ providedIn: 'root' })
export class ScannerAgentsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<ScannerAgent[]> {
    return this.http.get<ScannerAgent[]>(`${BASE_URL}/agents/`);
  }

  getByEvent(eventId: string): Observable<ScannerAgent[]> {
    return this.http.get<ScannerAgent[]>(`${BASE_URL}/events/${eventId}/agents/`);
  }

  // Contrairement à l'ancienne version, pinCode n'est plus fourni ici :
  // Django le génère lui-même côté serveur (voir ScannerAgentSerializer.create()),
  // et le renvoie dans la réponse.
  creerAgent(eventId: string, donnees: { gate: string; name: string; phone: string; role: string }): Observable<ScannerAgent> {
    return this.http.post<ScannerAgent>(`${BASE_URL}/events/${eventId}/agents/`, donnees);
  }

  supprimerAgent(eventId: string, agentId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/events/${eventId}/agents/${agentId}/`);
  }

  ajouterScannerAgent(donnees: Partial<ScannerAgent>): Observable<ScannerAgent> {
    return this.http.post<ScannerAgent>(`${BASE_URL}/events/${donnees.eventId}/agents/`, donnees);
  }
}
