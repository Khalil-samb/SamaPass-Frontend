import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

const TAUX_COMMISSION_SAMAPASS = 0.05; // les fameux 5%

@Component({
  imports: [FormsModule],
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

  recettesBrutes = computed(() => this.prixBillet() * this.nombreParticipants());
  fraisSamaPass = computed(() => Math.round(this.recettesBrutes() * TAUX_COMMISSION_SAMAPASS));
  reversementNet = computed(() => this.recettesBrutes() - this.fraisSamaPass());
}
