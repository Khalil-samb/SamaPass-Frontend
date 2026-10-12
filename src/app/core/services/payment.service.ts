import { Injectable } from '@angular/core';
import { PaymentMethod } from '../models/transaction.model';

export interface ResultatPaiement {
  success: boolean;
  reference: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  // Le backend est la source de vérité pour le paiement. Ce simulateur
  // ne doit plus échouer au hasard, sinon l’interface affiche un faux
  // "solde insuffisant" alors que le vrai appel a réussi.
  async payer(montant: number, methode: PaymentMethod): Promise<ResultatPaiement> {
    await this.attendre(1200);

    const forcerEchec = this.shouldForceFailure();
    const prefixe = methode.toUpperCase();
    const numeroAleatoire = Math.floor(Math.random() * 9_000_000 + 1_000_000);

    return {
      success: !forcerEchec,
      reference: `${prefixe}-SN-${numeroAleatoire}`,
    };
  }

  private attendre(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldForceFailure(): boolean {
    if (typeof window === 'undefined') return false;

    const fromUrl = new URLSearchParams(window.location.search).get('forcePaymentFailure');
    if (fromUrl === '1' || fromUrl === 'true') return true;

    const fromStorage = window.localStorage.getItem('forcePaymentFailure');
    return fromStorage === '1' || fromStorage === 'true';
  }
}
