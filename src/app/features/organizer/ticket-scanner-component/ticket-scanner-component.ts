import { AfterViewInit, Component, computed, effect, ElementRef, OnDestroy, OnInit, signal, untracked, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';

import { Ticket } from '../../../core/models';
import { AccessGate } from '../../../core/models/access-gate.model';
import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { TicketsService } from '../../../core/services/tickets.service';

interface DetailsScan {
  acheteur: string;
  telephone: string;
  categorie: string;
  evenement: string;
  prix: number;
  dateAchat: string;
  scanneLe: string | null;
  porte: string | null;
  agent: string | null;
  reference: string;
}

interface ResultatScan {
  statut: 'valide' | 'doublon' | 'invalide';
  message: string;
  ticket?: Ticket;
  billet?: Ticket;
  details?: DetailsScan;
}

@Component({
  imports: [FormsModule],
  standalone: true,
  selector: 'app-ticket-scanner-component',
  styleUrl: './ticket-scanner-component.css',
  templateUrl: './ticket-scanner-component.html',
})
export class TicketScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  gates = signal<AccessGate[]>([]);
  porteSelectionnee = signal('');

  // ⚠️ Remplace "users" : plus besoin d'une liste d'utilisateurs à part,
  // chaque billet porte déjà le nom de son acheteur (voir TicketSerializer).
  billetsDeEvenement = signal<Ticket[]>([]);

  cameraActive = signal(false);
  erreurCamera = signal<string | null>(null);
  dernierResultat = signal<ResultatScan | null>(null);
  doublonsSession = signal(0);
  historique = signal<ResultatScan[]>([]);

  saisieManuelle = '';

  get porteSelectionneeModel() { return this.porteSelectionnee(); } set porteSelectionneeModel(v: string) { this.porteSelectionnee.set(v); }
  get saisieManuelleModel() { return this.saisieManuelle; } set saisieManuelleModel(v: string) { this.saisieManuelle = v; }

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private enPauseApresScan = false;

  constructor(
    public eventStore: SelectedEventStore,
    private accessGatesService: AccessGatesService,
    private ticketsService: TicketsService
  ) {
    // Se relance à chaque changement d'événement sélectionné, y compris quand il
    // n'est connu qu'après le chargement du store (rechargement de la page).
    effect(() => {
      const eventId = this.eventStore.selectedEventId();
      if (!eventId) return;
      untracked(() => {
        this.chargerPortes(eventId);
        this.chargerBillets(eventId);
      });
    });
  }

  ngOnInit() {}

  private chargerPortes(eventId: string) {
    this.gates.set([]);
    this.porteSelectionnee.set('');
    this.accessGatesService.getByEvent(eventId).subscribe({
      next: (portes) => {
        // réponse d'un ancien événement arrivée en retard : on l'ignore
        if (this.eventStore.selectedEventId() !== eventId) return;
        this.gates.set(portes);
        const actuelle = this.porteSelectionnee();
        if (portes.length > 0 && !portes.some((p) => p.id === actuelle)) {
          this.porteSelectionnee.set(portes[0].id);
        }
      },
      error: () => this.gates.set([]),
    });
  }

  private chargerBillets(eventId: string) {
    this.ticketsService.billetsDeEvenement(eventId).subscribe((billets) => {
      this.billetsDeEvenement.set(billets);
    });
  }

  async ngAfterViewInit() {
    await this.demarrerCamera();
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.stream?.getTracks().forEach((t) => t.stop());
  }

  async demarrerCamera() {
    this.erreurCamera.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.videoRef.nativeElement.srcObject = this.stream;
      await this.videoRef.nativeElement.play();
      this.cameraActive.set(true);
      this.boucleDetection();
    } catch {
      this.cameraActive.set(false);
      this.erreurCamera.set(
        "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur, ou utilisez la saisie manuelle ci-dessous."
      );
    }
  }

  private boucleDetection = () => {
    if (!this.enPauseApresScan) {
      const video = this.videoRef.nativeElement;
      const canvas = this.canvasRef.nativeElement;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const contexte = canvas.getContext('2d');
        if (contexte) {
          contexte.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = contexte.getImageData(0, 0, canvas.width, canvas.height);
          const resultat = jsQR(image.data, image.width, image.height);
          if (resultat) {
            this.traiterCodeDetecte(resultat.data);
          }
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.boucleDetection);
  };

  private traiterCodeDetecte(contenu: string) {
    this.enPauseApresScan = true;
    this.verifierParQrCode(contenu);
    setTimeout(() => { this.enPauseApresScan = false; }, 2500);
  }

  private verifierParQrCode(qrCode: string) {
    this.ticketsService.scannerBillet({ qrCode, gateId: this.porteSelectionnee() || undefined }).subscribe({
      next: (resultat) => {
        this.enregistrerResultat(resultat);
        if (resultat.statut === 'doublon') this.doublonsSession.update((n) => n + 1);
        this.rafraichirBillets();
      },
      error: (erreur) => {
        this.dernierResultat.set({ statut: 'invalide', message: this.messageErreurScan(erreur) });
      },
    });
  }

  saisirManuellement() {
    const saisie = this.saisieManuelle.replace(/[\s-]/g, '').toLowerCase();
    if (!saisie) return;

    this.ticketsService.scannerBillet({ reference: saisie, gateId: this.porteSelectionnee() || undefined }).subscribe({
      next: (resultat) => {
        this.enregistrerResultat(resultat);
        if (resultat.statut === 'doublon') this.doublonsSession.update((n) => n + 1);
        this.rafraichirBillets();
      },
      error: (erreur) => {
        this.dernierResultat.set({ statut: 'invalide', message: this.messageErreurScan(erreur) });
      },
    });

    this.saisieManuelle = '';
  }

  // Message adapté à la vraie cause : réseau coupé, panne serveur, billet inconnu...
  private messageErreurScan(erreur: any): string {
    if (erreur?.status === 0) return 'Connexion impossible : vérifiez votre réseau.';
    if (erreur?.status >= 500) return 'Erreur du serveur. Réessayez dans un instant.';
    if (erreur?.status === 400) return 'Code invalide : saisissez les 8 caractères de la référence.';
    return erreur?.error?.message ?? erreur?.error?.erreur ?? 'Billet introuvable.';
  }

  private rafraichirBillets() {
    const eventId = this.eventStore.selectedEventId();
    if (eventId) this.chargerBillets(eventId);
  }

  private enregistrerResultat(resultat: ResultatScan) {
    this.dernierResultat.set(resultat);
    this.historique.update((h) => [resultat, ...h].slice(0, 5));
    try {
      navigator.vibrate?.(resultat.statut === 'valide' ? 60 : [120, 60, 120]);
    } catch {
      /* pas de vibration sur cet appareil */
    }
  }

  heure(iso?: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso));
  }

  dateHeure(iso?: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }

  ilYa(iso?: string | null): string {
    if (!iso) return '';
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `il y a ${s} s`;
    const m = Math.round(s / 60);
    if (m < 60) return `il y a ${m} min`;
    return `il y a ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }

  signalerLitige(ticket: Ticket) {
    this.ticketsService.signalerLitige(ticket.id).subscribe(() => {
      alert('Ce billet a été signalé en litige. Il apparaîtra dans la page Ventes & Billets.');
      this.rafraichirBillets();
    });
  }

  categorieDuTicket(ticket: any): string {
    return ticket.ticketTypeName ?? '';
  }

  nomAcheteur(ticket: any): string {
    return ticket.buyerName ?? 'Inconnu';
  }

  nomPorteSelectionnee(): string {
    return this.gates().find((g) => g.id === this.porteSelectionnee())?.name ?? '—';
  }

  validesSurCettePorte = computed(() =>
    this.billetsDeEvenement().filter((t: any) => t.gate === this.porteSelectionnee() && t.status === 'used').length
  );
}
