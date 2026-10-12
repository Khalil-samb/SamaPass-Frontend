import { AfterViewInit, Component, computed, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';

import { Ticket } from '../../../core/models';
import { AccessGate } from '../../../core/models/access-gate.model';
import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { TicketsService } from '../../../core/services/tickets.service';

interface ResultatScan {
  statut: 'valide' | 'doublon' | 'invalide';
  message: string;
  ticket?: Ticket;
  billet?: Ticket;
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
  ) {}

  ngOnInit() {
    const eventId = this.eventStore.selectedEventId();
    if (!eventId) return;

    this.accessGatesService.getByEvent(eventId).subscribe((portes) => {
      this.gates.set(portes);
      if (portes.length > 0) this.porteSelectionnee.set(portes[0].id);
    });

    this.chargerBillets(eventId);
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
        this.dernierResultat.set(resultat);
        if (resultat.statut === 'doublon') this.doublonsSession.update((n) => n + 1);
        this.rafraichirBillets();
      },
      error: (erreur) => {
        this.dernierResultat.set({ statut: 'invalide', message: erreur.error?.message ?? 'Billet introuvable.' });
      },
    });
  }

  saisirManuellement() {
    const saisie = this.saisieManuelle.trim();
    if (!saisie) return;

    this.ticketsService.scannerBillet({ reference: saisie, gateId: this.porteSelectionnee() || undefined }).subscribe({
      next: (resultat) => {
        this.dernierResultat.set(resultat);
        if (resultat.statut === 'doublon') this.doublonsSession.update((n) => n + 1);
        this.rafraichirBillets();
      },
      error: (erreur) => {
        this.dernierResultat.set({ statut: 'invalide', message: erreur.error?.message ?? 'Billet introuvable.' });
      },
    });

    this.saisieManuelle = '';
  }

  private rafraichirBillets() {
    const eventId = this.eventStore.selectedEventId();
    if (eventId) this.chargerBillets(eventId);
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
