import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { GainsSimulatorComponent } from './../gains-simulator-component/gains-simulator-component';
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
  imports: [RouterLink, IconComponent, GainsSimulatorComponent],
  standalone: true,
  selector: 'app-become-organizer-landing-component',
  styleUrl: './become-organizer-landing-component.css',
  templateUrl: './become-organizer-landing-component.html',
})
export class BecomeOrganizerLandingComponent {
  piliers: Pilier[] = [
    {
      icon: 'wallet',
      titre: 'Encaissement Mobile Money instantané',
      description: "Paiements 1-clic via Wave et Orange Money, sans compte bancaire professionnel. Virements automatiques vers votre compte en 2 heures.",
      lien: 'Liquidité immédiate garantie',
    },
    {
      icon: 'qr-code',
      titre: "Contrôle d'accès QR Code infalsifiable",
      description: "Application Scanner caméra ultra rapide. Protection anti-doublon et contrôle contre les captures d'écran.",
      lien: "Zéro doublon à l'entrée",
    },
    {
      icon: 'trending-up',
      titre: 'Visibilité maximale au Sénégal',
      description: "Mise en vitrine prioritaire sur l'accueil de SamaPass, notifications ciblées, intégration de lien d'achat WhatsApp et SMS.",
      lien: 'Portée renforcée dès la publication',
    },
    {
      icon: 'bar-chart-3',
      titre: 'Tableau de bord financier en direct',
      description: 'Suivi des ventes en temps réel, ventilation par type de billet. Export en un clic pour votre comptabilité.',
      lien: 'Exports PDF & Excel',
    },
  ];

  temoignages: Temoignage[] = [
    {
      texte: "Le paiement instantané Wave a transformé notre logistique de billetterie au Monument de la Renaissance. Fini les pertes d'argent liquide à l'entrée.",
      auteur: 'Mamadou Fall',
      fonction: 'Directeur général, Dakar Live Agency',
    },
    {
      texte: "Pour notre festival, nous avions besoin d'une comptabilité claire. Le tableau de bord de SamaPass nous permet d'exporter nos états certifiés dès la clôture de l'événement.",
      auteur: 'Aïssatou Ba',
      fonction: 'Coordinatrice billetterie, Collectif Festival Jazz',
    },
  ];
}
