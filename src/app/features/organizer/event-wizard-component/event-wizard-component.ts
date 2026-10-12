import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventWizardStepInfoComponent } from '../event-wizard-step-info-component/event-wizard-step-info-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { EventEntity } from '../../../core/models';
import { EventWizardStepTicketsComponent, ResultatEtape2, TicketTypeDraft } from '../event-wizard-step-tickets-component/event-wizard-step-tickets-component';
import { ResultatEtape3, EventWizardStepAccessComponent } from '../event-wizad-step-access-component/event-wizad-step-access-component';
import { EventWizardStepReviewComponent } from '../event-wizard-step-review-component/event-wizard-step-review-component';

interface EtapeAssistant {
  numero: number;
  titre: string;
}

@Component({
  imports: [RouterLink, RevealDirective, EventWizardStepInfoComponent, EventWizardStepTicketsComponent, EventWizardStepAccessComponent, EventWizardStepReviewComponent],
  standalone:true,
  selector: 'app-event-wizard-component',
  styleUrl: './event-wizard-component.css',
  templateUrl: './event-wizard-component.html',
})
export class EventWizardComponent {
  etapeActuelle = signal(1);

  // L'objet qui s'enrichit au fil des étapes, jusqu'à la création réelle à l'étape 4
  brouillon = signal<Partial<EventEntity>>({
    galleryUrls: [],
    lineup: [],
    feesBornBy: 'organizer',
    offlineModeEnabled: false,
    antiPassbackEnabled: false,
    allowTemporaryExits: false,
  });

  // Les catégories de billets restent à part : ce n'est pas un champ d'Event,
  // mais une liste de TicketType à créer séparément une fois l'événement publié.
  ticketTypesDraft = signal<TicketTypeDraft[]>([]);


  // Résultat de l'étape 3 (portes, agents, sécurité), gardé pour pouvoir
  // y revenir sans perdre ce qui a été saisi
  etape3Draft = signal<ResultatEtape3>({
    gates: [],
    agents: [],
    security: { offlineModeEnabled: false, antiPassbackEnabled: false, allowTemporaryExits: false },
  });

  etapes: EtapeAssistant[] = [
    { numero: 1, titre: 'Informations & Lieu' },
    { numero: 2, titre: 'Billetterie & Tarifs' },
    { numero: 3, titre: 'Contrôle & Accès' },
    { numero: 4, titre: 'Récapitulatif & Publi.' },
  ];

  // État d'une étape dans la barre de progression
  statutEtape(numero: number): 'faite' | 'actuelle' | 'avenir' {
    if (numero < this.etapeActuelle()) return 'faite';
    if (numero === this.etapeActuelle()) return 'actuelle';
    return 'avenir';
  }

  onEtape1Terminee(patch: Partial<EventEntity>) {
    this.brouillon.update((b) => ({ ...b, ...patch }));
    this.etapeActuelle.set(2);
  }
  onEtape2Terminee(resultat: ResultatEtape2) {
    this.ticketTypesDraft.set(resultat.ticketTypes);
    this.brouillon.update((b) => ({ ...b, ...resultat.eventPatch }));
    this.etapeActuelle.set(3);
  }

  onEtape3Terminee(resultat: ResultatEtape3) {
    this.etape3Draft.set(resultat);
    this.brouillon.update((b) => ({
      ...b,
      offlineModeEnabled: resultat.security.offlineModeEnabled,
      antiPassbackEnabled: resultat.security.antiPassbackEnabled,
      allowTemporaryExits: resultat.security.allowTemporaryExits,
    }));
    this.etapeActuelle.set(4);
  }
}

