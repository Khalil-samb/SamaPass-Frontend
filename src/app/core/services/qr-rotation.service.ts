import { Injectable, signal } from '@angular/core';

const INTERVALLE_ROTATION_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class QrRotationService {
  private codeActuel = signal<string>('');
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Démarre la rotation du QR Code pour un billet donné.
   *
   * ⚠️ Aujourd'hui (sans backend) : génère un nouveau jeton côté navigateur
   * toutes les 30 secondes — c'est un effet visuel, pas une vraie protection
   * anti-fraude, puisque n'importe qui pourrait recalculer ce jeton.
   *
   * Le jour du backend : cette méthode devra plutôt ouvrir un flux temps réel
   * (WebSocket, ou un simple polling vers une API) qui renvoie le VRAI jeton
   * signé par le serveur, impossible à deviner. Le composant qui affiche le
   * QR Code, lui, ne changera pas une seule ligne : il continuera d'appeler
   * `codeQrActuel()` exactement pareil.
   */
  demarrerRotation(qrCodeBase: string) {
    this.genererNouveauJeton(qrCodeBase);
    this.arreterRotation();
    this.intervalId = setInterval(() => this.genererNouveauJeton(qrCodeBase), INTERVALLE_ROTATION_MS);
  }

  arreterRotation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  codeQrActuel() {
    return this.codeActuel.asReadonly();
  }

  private genererNouveauJeton(qrCodeBase: string) {
    const jetonAleatoire = Math.random().toString(36).slice(2, 10);
    this.codeActuel.set(`${qrCodeBase}-${jetonAleatoire}-${Date.now()}`);
  }
}
