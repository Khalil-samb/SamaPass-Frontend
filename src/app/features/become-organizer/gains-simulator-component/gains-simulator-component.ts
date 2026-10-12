import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

import { PlatformRateStore } from '../../../core/state/platform-rate.store';

@Component({
  imports: [FormsModule, RouterLink, RevealDirective],
  standalone: true,
  selector: 'app-gains-simulator-component',
  styleUrl: './gains-simulator-component.css',
  templateUrl: './gains-simulator-component.html',
})
export class GainsSimulatorComponent {
  prixBillet = signal(10000);
  nombreParticipants = signal(1500);

  // ngModel a besoin de getters/setters classiques pour se brancher sur des signals
  get prixBilletModel() {
    return this.prixBillet();
  }
  set prixBilletModel(valeur: number) {
    this.prixBillet.set(Number(valeur));
  }

  get participantsModel() {
    return this.nombreParticipants();
  }
  set participantsModel(valeur: number) {
    this.nombreParticipants.set(Number(valeur));
  }

  // Le taux affiché et utilisé est celui que l'admin a réglé (plus de « 5 % » en dur)
  constructor(private platformRate: PlatformRateStore) {
    this.platformRate.charger();
  }

  tauxCommission = computed(() => this.platformRate.commissionRate());

  recettesBrutes = computed(() => this.prixBillet() * this.nombreParticipants());
  fraisKcrowd = computed(() => Math.round((this.recettesBrutes() * this.platformRate.commissionRate()) / 100));
  reversementNet = computed(() => this.recettesBrutes() - this.fraisKcrowd());
}

