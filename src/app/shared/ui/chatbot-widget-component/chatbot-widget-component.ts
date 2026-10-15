import { Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../../core/state/auth.store';
import { ChatbotService, MessageHistorique } from '../../../core/services/chatbot.service';


interface MessageAffiche {
  role: 'user' | 'assistant';
  texte: string;
  liens?: { label: string; path: string }[];
  vocal?: boolean;
}

// Premières questions proposées, selon le rôle de la personne connectée.
const SUGGESTIONS: Record<string, string[]> = {
  user: ['Comment acheter un billet ?', 'Où retrouver mon billet et son QR code ?', 'Que faire si mon QR code est abîmé ?'],
  organizer: ['Comment publier mon événement ?', 'Comment recevoir l\'argent de mes ventes ?', 'Comment scanner les billets à l\'entrée ?'],
  admin: ['Quelle commission la plateforme perçoit-elle ?', 'Comment suspendre un compte ?', 'Comment modifier le taux de commission ?'],
};

const DUREE_MAX_ENREGISTREMENT_S = 60;
const DUREE_MIN_ENREGISTREMENT_S = 0.7;
const TAUX_ECHANTILLONNAGE = 16000; // 16 kHz mono : suffisant pour la voix, et léger à envoyer

@Component({
  imports: [FormsModule, RouterLink],
  standalone: true,
  selector: 'app-chatbot-widget-component',
  styleUrl: './chatbot-widget-component.css',
  templateUrl: './chatbot-widget-component.html',
})
export class ChatbotWidgetComponent implements OnDestroy {
  @ViewChild('zoneMessages') private zoneMessages?: ElementRef<HTMLDivElement>;
  @ViewChild('champ') private champ?: ElementRef<HTMLInputElement>;

  ouvert = signal(false);
  messages = signal<MessageAffiche[]>([]);
  enCours = signal(false);
  attenteLongue = signal(false);
  erreur = signal<string | null>(null);
  reessayable = signal(true);
  saisie = '';

  // ── Voix ──
  microDisponible = typeof MediaRecorder !== 'undefined';
  enregistrement = signal(false);
  secondesEnregistrees = signal(0);
  lectureEn = signal<number | null>(null);
  chargementVoix = signal<number | null>(null);

  suggestions = computed(() => SUGGESTIONS[this.authStore.currentUser()?.role ?? 'user'] ?? SUGGESTIONS['user']);

  private minuteurAttente: ReturnType<typeof setTimeout> | null = null;
  private dernierMessage = '';

  private enregistreur: MediaRecorder | null = null;
  private flux: MediaStream | null = null;
  private morceaux: Blob[] = [];
  private minuteurEnregistrement: ReturnType<typeof setInterval> | null = null;
  private debutEnregistrement = 0;
  private annuleEnregistrement = false;
  private lecteur: HTMLAudioElement | null = null;
  private audios = new Map<string, string>(); // texte lu -> adresse du son déjà généré

  constructor(
    public authStore: AuthStore,
    private chatbotService: ChatbotService
  ) {}

  ngOnDestroy() {
    this.arreterAttente();
    this.annulerEnregistrement();
    this.arreterLecture();
    this.audios.forEach((url) => URL.revokeObjectURL(url));
    this.audios.clear();
  }

  ouvrir() {
    this.ouvert.set(true);
    setTimeout(() => this.champ?.nativeElement.focus(), 60);
    this.defilerVersLeBas();
  }

  fermer() {
    this.ouvert.set(false);
    this.annulerEnregistrement();
    this.arreterLecture();
  }

  envoyer(event: Event) {
    event.preventDefault();
    this.envoyerTexte(this.saisie);
  }

  envoyerTexte(brut: string) {
    const texte = brut.trim();
    if (!texte || this.enCours() || this.enregistrement()) return;

    this.arreterLecture();
    this.messages.update((liste) => [...liste, { role: 'user', texte }]);
    this.saisie = '';
    this.dernierMessage = texte;
    this.erreur.set(null);
    this.reessayable.set(true);
    this.enCours.set(true);
    this.attenteLongue.set(false);
    this.minuteurAttente = setTimeout(() => this.attenteLongue.set(true), 8000);
    this.defilerVersLeBas();

    // Les 12 derniers échanges suffisent pour garder le fil de la conversation
    const historique: MessageHistorique[] = this.messages()
      .filter((m) => !!m.texte)
      .map((m) => ({ role: m.role, content: m.texte }))
      .slice(0, -1)
      .slice(-12);

    this.chatbotService.envoyerMessage(texte, historique).subscribe({
      next: (reponse) => {
        this.arreterAttente();
        this.messages.update((liste) => [
          ...liste,
          { role: 'assistant', texte: this.nettoyer(reponse.reponse), liens: reponse.liens },
        ]);
        this.enCours.set(false);
        this.defilerVersLeBas();
      },
      error: () => {
        this.arreterAttente();
        this.enCours.set(false);
        this.erreur.set("L'assistant est momentanément indisponible. Vous pouvez réessayer dans un instant.");
        this.defilerVersLeBas();
      },
    });
  }

  // Après une erreur, renvoie le même message sans l'afficher deux fois.
  reessayer() {
    const texte = this.dernierMessage;
    if (!texte || this.enCours()) return;
    this.messages.update((liste) => liste.slice(0, -1));
    this.envoyerTexte(texte);
  }

  effacer() {
    if (this.enCours()) return;
    this.arreterLecture();
    this.messages.set([]);
    this.erreur.set(null);
    this.dernierMessage = '';
  }

  // ═════════════════ Micro : parler à l'assistant ═════════════════

  async basculerMicro() {
    if (this.enregistrement()) {
      this.arreterEnregistrement(); // 2e appui : on envoie
      return;
    }
    if (this.enCours()) return;
    await this.demarrerEnregistrement();
  }

  private async demarrerEnregistrement() {
    this.erreur.set(null);
    this.reessayable.set(false);
    this.arreterLecture();

    if (!this.microDisponible || !navigator.mediaDevices?.getUserMedia) {
      this.erreur.set("Le micro n'est pas disponible ici : il faut une connexion sécurisée (HTTPS) ou localhost.");
      return;
    }
    try {
      this.flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      this.erreur.set("Impossible d'accéder au micro. Autorisez-le dans votre navigateur, puis réessayez.");
      return;
    }

    this.morceaux = [];
    this.annuleEnregistrement = false;
    const enregistreur = new MediaRecorder(this.flux);
    enregistreur.ondataavailable = (e) => {
      if (e.data.size > 0) this.morceaux.push(e.data);
    };
    enregistreur.onstop = () => void this.finEnregistrement(enregistreur.mimeType);
    this.enregistreur = enregistreur;

    enregistreur.start();
    this.debutEnregistrement = Date.now();
    this.secondesEnregistrees.set(0);
    this.enregistrement.set(true);
    this.minuteurEnregistrement = setInterval(() => {
      const secondes = Math.floor((Date.now() - this.debutEnregistrement) / 1000);
      this.secondesEnregistrees.set(secondes);
      if (secondes >= DUREE_MAX_ENREGISTREMENT_S) this.arreterEnregistrement();
    }, 250);
  }

  arreterEnregistrement() {
    if (this.enregistreur && this.enregistreur.state !== 'inactive') this.enregistreur.stop();
  }

  annulerEnregistrement() {
    if (!this.enregistrement()) return;
    this.annuleEnregistrement = true;
    this.arreterEnregistrement();
  }

  private libererMicro() {
    if (this.minuteurEnregistrement) clearInterval(this.minuteurEnregistrement);
    this.minuteurEnregistrement = null;
    this.flux?.getTracks().forEach((piste) => piste.stop());
    this.flux = null;
    this.enregistreur = null;
    this.enregistrement.set(false);
  }

  private async finEnregistrement(mime: string) {
    const duree = (Date.now() - this.debutEnregistrement) / 1000;
    this.libererMicro();
    if (this.annuleEnregistrement) return;
    if (duree < DUREE_MIN_ENREGISTREMENT_S) {
      this.erreur.set("Message trop court : parlez un peu plus longtemps avant de valider.");
      return;
    }
    await this.envoyerVocal(new Blob(this.morceaux, { type: mime || 'audio/webm' }));
  }

  private async envoyerVocal(blob: Blob) {
    // Historique pris AVANT d'ajouter le message vocal
    const historique: MessageHistorique[] = this.messages()
      .filter((m) => !!m.texte)
      .map((m) => ({ role: m.role, content: m.texte }))
      .slice(-12);

    const indexMessage = this.messages().length;
    this.messages.update((liste) => [...liste, { role: 'user', texte: 'Message vocal…', vocal: true }]);
    this.enCours.set(true);
    this.attenteLongue.set(false);
    this.minuteurAttente = setTimeout(() => this.attenteLongue.set(true), 8000);
    this.defilerVersLeBas();

    const retirerMessageVocal = () => this.messages.update((liste) => liste.filter((_, i) => i !== indexMessage));

    let audioBase64: string;
    try {
      audioBase64 = await this.versWavBase64(blob);
    } catch {
      this.arreterAttente();
      this.enCours.set(false);
      retirerMessageVocal();
      this.reessayable.set(false);
      this.erreur.set("Impossible de lire l'enregistrement sur ce navigateur. Écrivez votre message à la place.");
      return;
    }

    this.chatbotService.envoyerVocal(audioBase64, 'audio/wav', historique).subscribe({
      next: (reponse) => {
        this.arreterAttente();
        this.messages.update((liste) =>
          liste.map((m, i) => (i === indexMessage ? { ...m, texte: reponse.transcription } : m))
        );
        this.messages.update((liste) => [
          ...liste,
          { role: 'assistant', texte: this.nettoyer(reponse.reponse), liens: reponse.liens },
        ]);
        this.enCours.set(false);
        this.defilerVersLeBas();
        // Question posée à voix haute : la réponse est lue à voix haute (si le navigateur le permet)
        void this.ecouter(this.messages().length - 1, true);
      },
      error: (e) => {
        this.arreterAttente();
        this.enCours.set(false);
        retirerMessageVocal();
        this.reessayable.set(false);
        const detail = typeof e?.error?.detail === 'string' ? e.error.detail : null;
        this.erreur.set(
          e?.status === 422 && detail
            ? detail
            : "L'assistant n'a pas pu traiter votre message vocal. Réessayez, ou écrivez-le."
        );
        this.defilerVersLeBas();
      },
    });
  }

  // Décode l'enregistrement du navigateur (WebM, MP4...) puis le convertit en WAV mono 16 kHz,
  // un format que le serveur et Gemini acceptent partout.
  private async versWavBase64(blob: Blob): Promise<string> {
    const ClasseAudio = window.AudioContext || (window as any).webkitAudioContext;
    const contexte = new ClasseAudio();
    let audio: AudioBuffer;
    try {
      audio = await contexte.decodeAudioData(await blob.arrayBuffer());
    } finally {
      void contexte.close();
    }

    const hors = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * TAUX_ECHANTILLONNAGE)), TAUX_ECHANTILLONNAGE);
    const source = hors.createBufferSource();
    source.buffer = audio;
    source.connect(hors.destination);
    source.start();
    const echantillons = (await hors.startRendering()).getChannelData(0);

    const taille = echantillons.length * 2;
    const tampon = new ArrayBuffer(44 + taille);
    const vue = new DataView(tampon);
    const ecrire = (position: number, texte: string) => {
      for (let i = 0; i < texte.length; i++) vue.setUint8(position + i, texte.charCodeAt(i));
    };
    ecrire(0, 'RIFF');
    vue.setUint32(4, 36 + taille, true);
    ecrire(8, 'WAVE');
    ecrire(12, 'fmt ');
    vue.setUint32(16, 16, true);
    vue.setUint16(20, 1, true); // PCM
    vue.setUint16(22, 1, true); // mono
    vue.setUint32(24, TAUX_ECHANTILLONNAGE, true);
    vue.setUint32(28, TAUX_ECHANTILLONNAGE * 2, true);
    vue.setUint16(32, 2, true);
    vue.setUint16(34, 16, true);
    ecrire(36, 'data');
    vue.setUint32(40, taille, true);
    for (let i = 0; i < echantillons.length; i++) {
      const s = Math.max(-1, Math.min(1, echantillons[i]));
      vue.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const octets = new Uint8Array(tampon);
    let binaire = '';
    const pas = 0x4000;
    for (let i = 0; i < octets.length; i += pas) {
      binaire += String.fromCharCode.apply(null, Array.from(octets.subarray(i, i + pas)));
    }
    return btoa(binaire);
  }

  // ═════════════════ Écouter une réponse ═════════════════

  async ecouter(index: number, automatique = false) {
    const message = this.messages()[index];
    if (!message || message.role !== 'assistant') return;

    if (this.lectureEn() === index) {
      this.arreterLecture(); // 2e appui : stop
      return;
    }
    this.arreterLecture();

    const texte = this.extraitPourLecture(message.texte);
    if (!texte) return;

    let url = this.audios.get(texte);
    if (!url) {
      this.chargementVoix.set(index);
      try {
        const son = await firstValueFrom(this.chatbotService.synthetiser(texte));
        url = URL.createObjectURL(son);
        this.audios.set(texte, url);
      } catch {
        if (!automatique) {
          this.reessayable.set(false);
          this.erreur.set('La lecture à voix haute est momentanément indisponible. Le texte reste lisible ci-dessus.');
        }
        return;
      } finally {
        this.chargementVoix.set(null);
      }
    }

    const lecteur = new Audio(url);
    this.lecteur = lecteur;
    this.lectureEn.set(index);
    const fin = () => {
      if (this.lecteur === lecteur) {
        this.lecteur = null;
        this.lectureEn.set(null);
      }
    };
    lecteur.onended = fin;
    lecteur.onerror = fin;
    try {
      await lecteur.play();
    } catch {
      fin(); // lecture automatique refusée par le navigateur : le bouton « Écouter » reste disponible
    }
  }

  arreterLecture() {
    if (this.lecteur) {
      this.lecteur.pause();
      this.lecteur = null;
    }
    this.lectureEn.set(null);
  }

  // Le serveur lit au plus 700 caractères : on coupe proprement à la fin d'une phrase.
  private extraitPourLecture(texte: string): string {
    const propre = texte.replace(/\s+/g, ' ').trim();
    if (propre.length <= 600) return propre;
    const coupe = propre.slice(0, 600);
    const fin = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('! '), coupe.lastIndexOf('? '));
    return fin > 200 ? coupe.slice(0, fin + 1) : coupe;
  }

  // Le texte s'affiche tel quel : on retire donc les symboles de mise en forme que certains modèles ajoutent.
  private nettoyer(texte: string): string {
    return texte.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').trim();
  }

  private arreterAttente() {
    if (this.minuteurAttente) clearTimeout(this.minuteurAttente);
    this.minuteurAttente = null;
    this.attenteLongue.set(false);
  }

  private defilerVersLeBas() {
    setTimeout(() => {
      const element = this.zoneMessages?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }

  @HostListener('document:keydown.escape')
  surEchap() {
    this.fermer();
  }
}
