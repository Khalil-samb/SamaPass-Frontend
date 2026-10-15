
import { Component, Input, computed, signal } from '@angular/core';


const LOGOS: Record<string, { src: string; libelle: string }> = {
  wave: { src: '/images/logoWave.png', libelle: 'Wave' },
  orange_money: { src: '/images/logo%20OrangeMoney.png', libelle: 'Orange Money' },
  free_money: { src: '/images/logo%20FreeMoney.png', libelle: 'Free Money' },
  card: { src: '/images/logo%20CarteBanquaire.png', libelle: 'Carte bancaire' },
};


@Component({
  imports: [],
  standalone:true,
  selector: 'app-payment-logo-component',
  styleUrl: './payment-logo-component.css',
  templateUrl: './payment-logo-component.html',
})

export class PaymentLogoComponent {
  private methodeSignal = signal('');

  // Accepte n'importe quelle chaîne : une valeur inconnue s'affiche
  // simplement en texte, sans jamais faire planter la page.
  @Input({ required: true }) set method(valeur: string) {
    this.methodeSignal.set(valeur ?? '');
    this.imageIndisponible.set(false);
  }

  // Hauteur du logo en pixels (la largeur s'adapte toute seule)
  @Input() height = 24;

  imageIndisponible = signal(false);

  logo = computed(() => LOGOS[this.methodeSignal()] ?? null);
  libelle = computed(() => LOGOS[this.methodeSignal()]?.libelle ?? this.methodeSignal());
}

