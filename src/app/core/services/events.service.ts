import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { EventEntiy } from "../models";


@Injectable({ providedIn: 'root'})
export class EventsService {
  constructor(private http: HttpClient){}

  // Récupére tous les événements. Pour l'instant, ca lit un fichier JSON local.
  // Le jour du backend, seule cette ligne changera (l'adresse deviendra celle de votre API)
  // aucun composant qui utilise ce service n'aura a bouger.
  getAll(): Observable<EventEntiy[]>{
    return this.http.get<EventEntiy[]>('mock-data/events.json');
  }
}
