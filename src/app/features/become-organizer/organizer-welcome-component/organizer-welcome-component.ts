import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrganizersService } from '../../../core/services/organizers.service';
import { AuthStore } from '../../../core/state/auth.store';
import { Organizer } from '../../../core/models/organizer.model';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

interface EtapeGuide {
  numero: number;
  icon: 'tag' | 'share';
  titre: string;
  description: string;
  lien: string;
}
@Component({
  imports: [IconComponent, RouterLink, RevealDirective],
  selector: 'app-organizer-welcome-component',
  styleUrl: './organizer-welcome-component.css',
  templateUrl: './organizer-welcome-component.html',
})
export class OrganizerWelcomeComponent implements OnInit {
  organizer = signal<Organizer | null>(null);
  messageKit = signal<string | null>(null);

  etapesGuide: EtapeGuide[] = [
    {
      numero: 1,
      icon: 'tag',
      titre: "Créer la fiche de l'événement",
      description: 'Ajoutez votre affiche officielle, fixez les dates, la programmation et spécifiez le lieu.',
      lien: 'Configurer les détails',
    },
    {
      numero: 2,
      icon: 'tag',
      titre: 'Définir les catégories de billets',
      description: 'Configurez vos grilles tarifaires en FCFA (Standard, VIP, offres Early Bird avec quotas limités).',
      lien: 'Tarifier la billetterie',
    },
    {
      numero: 3,
      icon: 'share',
      titre: 'Partager le lien de vente',
      description: "Obtenez votre lien d'achat pour Instagram, WhatsApp et TikTok, et votre QR Code imprimable.",
      lien: 'Aperçu des canaux',
    },
  ];

  nomUtilisateur = computed(() => this.authStore.currentUser()?.firstName ?? '');
  initiales = computed(() => (this.nomUtilisateur()[0] ?? '?').toUpperCase());
  nomEspaceTravail = computed(() => this.organizer()?.organizationName ?? '');
  numeroCompte = computed(() => this.organizer()?.mobileMoneyAccountNumber ?? '');
  labelMoyenPaiement = computed(() => (this.organizer()?.paymentMethod === 'orange_money' ? 'Orange Money' : 'Wave'));

  constructor(
    private organizersService: OrganizersService,
    private authStore: AuthStore,
    private platformRate: PlatformRateStore
  ) {}

  // Le taux réglé par l'admin (jamais un chiffre écrit en dur)
  tauxCommission = computed(() => this.platformRate.commissionRate());

  ngOnInit() {
    this.platformRate.charger();
    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) return;

    // ⚠️ getMonProfil() (PAS getAll().find(...)) : même correction que
    // pour SelectedEventStore — un organisateur ne peut récupérer QUE
    // son propre profil, pas la liste de tous les organisateurs
    // (endpoint réservé à l'administrateur, d'où le "403 Accès réservé
    // aux administrateurs" que vous avez vu).
    this.organizersService.getMonProfil().subscribe((monOrganizer) => {
      this.organizer.set(monOrganizer);
    });
  }


  kitBientotDisponible() {
    this.messageKit.set('Le kit de communication sera bientôt disponible au téléchargement.');
  }
}

