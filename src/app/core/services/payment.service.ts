import { Injectable } from '@angular/core';
import { PaymentMethod } from '../models/transaction.model';

export interface ResultatPaiement {
  success: boolean;
  reference: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  // En mode test : 90% des paiements réussissent, pour pouvoir quand même
  // tester l'écran d'échec sans devoir tricher à chaque fois.
  async payer(montant: number, methode: PaymentMethod): Promise<ResultatPaiement> {
    await this.attendre(1200); // simule le temps de traitement réel d'un paiement

    const succes = Math.random() > 0.1; // 90% de chances de succès
    const prefixe = methode.toUpperCase(); // pour que la référence de paiement indique le moyen utilisé
    const numeroAleatoire = Math.floor(Math.random() * 9_000_000 + 1_000_000); // génère un nombre aléatoire à 7 chiffres (entre 1 000 000 et 9 999 999)

    return {
      success: succes,
      reference: `${prefixe}-SN-${numeroAleatoire}`, // exemple : "WAVE-SN-1234567"
    };
  }

  private attendre(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
