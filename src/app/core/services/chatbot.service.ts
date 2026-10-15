import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//  Le service FastAPI tourne sur son propre port (8002 par défaut, dans
// ces exemples), séparé du port de Django. Mettez la vraie adresse ici :
// pour la production, faites-en une variable d'environment comme les autres.
const CHATBOT_URL = 'http://localhost:8002';

export interface MessageHistorique {
  role: 'user' | 'assistant';
  content: string;
}

export interface LienPropose {
  label: string;
  path: string;
}

export interface ReponseChatbot {
  reponse: string;
  liens: LienPropose[];
}

export interface ReponseVocale {
  transcription: string;
  langue: string;
  reponse: string;
  liens: LienPropose[];
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private http: HttpClient) {}

  // Pas besoin d'ajouter le jeton manuellement ici : l'intercepteur
  // auth.interceptor.ts existant l'ajoute déjà automatiquement à CHAQUE
  // requête HTTP sortante, y compris celles-ci.
  envoyerMessage(message: string, historique: MessageHistorique[]): Observable<ReponseChatbot> {
    return this.http.post<ReponseChatbot>(`${CHATBOT_URL}/chat`, { message, historique });
  }

  // Message vocal : l'audio (WAV, base64) est transcrit puis traité comme un message écrit.
  envoyerVocal(audioBase64: string, mimeType: string, historique: MessageHistorique[]): Observable<ReponseVocale> {
    return this.http.post<ReponseVocale>(`${CHATBOT_URL}/chat-vocal`, {
      audio_base64: audioBase64,
      mime_type: mimeType,
      historique,
    });
  }

  // Lecture à voix haute d'une réponse : renvoie un fichier audio WAV.
  synthetiser(texte: string): Observable<Blob> {
    return this.http.post(`${CHATBOT_URL}/voix`, { texte }, { responseType: 'blob' });
  }
}
