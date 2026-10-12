import { Injectable, signal } from '@angular/core';

import { PlatformSettingsService } from '../services/platform_setting.service';

// Le taux de commission EN VIGUEUR, lu une fois et partagé par tout ce qui l'affiche ou
// l'utilise pour une ESTIMATION (assistant de création d'événement, simulateur de gains).
// Les chiffres des ventes déjà réalisées, eux, viennent de Django, au taux figé de chaque vente.
@Injectable({ providedIn: 'root' })
export class PlatformRateStore {
  // 5 % tant que le serveur n'a pas répondu (ou s'il est injoignable) : le taux historique
  commissionRate = signal(5);
  charge = signal(false);

  private enCours = false;

  constructor(private settingsService: PlatformSettingsService) {}

  // Sans effet s'il est déjà chargé : on peut l'appeler depuis chaque composant sans souci
  charger() {
    if (this.charge() || this.enCours) return;
    this.enCours = true;
    this.settingsService.getTauxPublic().subscribe({
      next: (reponse) => {
        this.commissionRate.set(Number(reponse.commissionRate));
        this.charge.set(true);
        this.enCours = false;
      },
      error: () => {
        this.enCours = false; // on garde 5 %, et on réessaiera au prochain appel
      },
    });
  }

  // Appelé par la page de réglages juste après un enregistrement réussi : les estimations
  // de la même session utilisent tout de suite le nouveau taux.
  definir(taux: number) {
    this.commissionRate.set(taux);
    this.charge.set(true);
  }
}
