
import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/state/auth.store';
import { ChatbotService, MessageHistorique } from '../../../core/services/chatbot.service';


interface MessageAffiche {
  role: 'user' | 'assistant';
  texte: string;
  liens?: { label: string; path: string }[];
}

@Component({
  imports: [FormsModule, RouterLink],
  standalone:true,
  selector: 'app-chatbot-widget-component',
  styleUrl: './chatbot-widget-component.css',
  templateUrl: './chatbot-widget-component.html',
})

export class ChatbotWidgetComponent {
  @ViewChild('zoneMessages') private zoneMessages?: ElementRef<HTMLDivElement>;

  ouvert = signal(false);
  messages = signal<MessageAffiche[]>([]);
  enCours = signal(false);
  erreur = signal<string | null>(null);
  saisie = '';

  constructor(
    public authStore: AuthStore,
    private chatbotService: ChatbotService
  ) {}

  envoyer(event: Event) {
    event.preventDefault();
    const texte = this.saisie.trim();
    if (!texte || this.enCours()) return;

    this.messages.update((liste) => [...liste, { role: 'user', texte }]);
    this.saisie = '';
    this.erreur.set(null);
    this.enCours.set(true);
    this.defilerVersLeBas();

    const historique: MessageHistorique[] = this.messages()
      .filter((m) => !!m.texte)
      .map((m) => ({ role: m.role, content: m.texte }));

    this.chatbotService.envoyerMessage(texte, historique.slice(0, -1)).subscribe({
      next: (reponse) => {
        this.messages.update((liste) => [...liste, { role: 'assistant', texte: reponse.reponse, liens: reponse.liens }]);
        this.enCours.set(false);
        this.defilerVersLeBas();
      },
      error: () => {
        this.enCours.set(false);
        this.erreur.set("L'assistant est momentanément indisponible. Réessayez dans un instant.");
      },
    });
  }

  private defilerVersLeBas() {
    setTimeout(() => {
      const element = this.zoneMessages?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }

  @HostListener('document:keydown.escape')
  surEchap() {
    this.ouvert.set(false);
  }
}

