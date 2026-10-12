import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { GainsSimulatorComponent } from './../gains-simulator-component/gains-simulator-component';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';
interface Pilier {
  icon: 'wallet' | 'qr-code' | 'trending-up' | 'bar-chart-3';
  titre: string;
  description: string;
  lien: string;
}

interface Temoignage {
  texte: string;
  auteur: string;
  fonction: string;
}


@Component({
  imports: [RouterLink, IconComponent, GainsSimulatorComponent, RevealDirective],
  standalone: true,
  selector: 'app-become-organizer-landing-component',
  styleUrl: './become-organizer-landing-component.css',
  templateUrl: './become-organizer-landing-component.html',
})
export class BecomeOrganizerLandingComponent {
  // Le taux de commission réglé par l'admin (plus de « 5 % » écrit en dur dans la page)
  tauxCommission = computed(() => this.platformRate.commissionRate());

  constructor(private platformRate: PlatformRateStore) {
    this.platformRate.charger();
  }

  piliers: Pilier[] = [
    {
      icon: 'wallet',
      titre: 'Encaissement Mobile Money instantané',
      description: "Paiements 1-clic via Wave et Orange Money, sans compte bancaire professionnel. Reversement vers votre compte sur simple demande.",
      lien: 'Reversement à la demande',
    },
    {
      icon: 'qr-code',
      titre: "Contrôle d'accès par QR Code unique",
      description: "Scan des billets par caméra depuis votre espace organisateur. Un billet déjà scanné est refusé : zéro doublon à l'entrée.",
      lien: "Zéro doublon à l'entrée",
    },
    {
      icon: 'trending-up',
      titre: 'Visibilité maximale au Sénégal',
      description: "Votre événement est publié dans le catalogue Kcrowd, avec un lien de partage direct et un QR Code prêts pour WhatsApp, Facebook et vos affiches.",
      lien: 'Prêt à partager dès la publication',
    },
    {
      icon: 'bar-chart-3',
      titre: 'Tableau de bord financier en direct',
      description: 'Suivi des ventes mis à jour automatiquement, ventilation par type de billet. Export CSV des participants en un clic.',
      lien: 'Export CSV en un clic',
    },
  ];

  temoignages: Temoignage[] = [
    {
      texte: "Le paiement instantané Wave a transformé notre logistique de billetterie au Monument de la Renaissance. Fini les pertes d'argent liquide à l'entrée.",
      auteur: 'Mamadou Fall',
      fonction: 'Directeur général, Dakar Live Agency',
    },
    {
      texte: "Pour notre festival, nous avions besoin d'une comptabilité claire. Le tableau de bord de Kcrowd nous permet d'exporter nos états dès la clôture de l'événement.",
      auteur: 'Aïssatou Ba',
      fonction: 'Coordinatrice billetterie, Collectif Festival Jazz',
    },
  ];
}

