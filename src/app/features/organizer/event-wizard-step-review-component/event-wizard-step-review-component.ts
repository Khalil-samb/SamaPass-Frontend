import { Component, OnInit, Input, Output, EventEmitter, signal, computed }from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { ScannerAgentsService } from '../../../core/services/scanner-agents.service';

import { EventEntity } from '../../../core/models/event.model';
import { TicketTypeDraft } from '../event-wizard-step-tickets-component/event-wizard-step-tickets-component';
import { ResultatEtape3 } from '../event-wizad-step-access-component/event-wizad-step-access-component';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';




@Component({
  imports: [FormsModule, IconComponent, RevealDirective],
  standalone:true,
  selector: 'app-event-wizard-step-review-component',
  styleUrl: './event-wizard-step-review-component.css',
  templateUrl: './event-wizard-step-review-component.html',
})


export class EventWizardStepReviewComponent implements OnInit {
  @Input({ required: true }) brouillon!: Partial<EventEntity>;
  @Input({ required: true }) ticketTypesDraft!: TicketTypeDraft[];
  @Input({ required: true }) etape3Draft!: ResultatEtape3;
  @Output() retour = new EventEmitter<void>();

  erreur = signal<string | null>(null);
  publicationEnCours = signal(false);
  engagementPrefectoral = signal(false);
  engagementReversement = signal(false);

  get engagementPrefectoralModel() { return this.engagementPrefectoral(); }set engagementPrefectoralModel(v: boolean) { this.engagementPrefectoral.set(v); }
  get engagementReversementModel() { return this.engagementReversement(); }set engagementReversementModel(v: boolean) { this.engagementReversement.set(v); }

  recetteBrute = computed(() => this.ticketTypesDraft.reduce((s, t) => s + t.price * t.quantityTotal, 0));
  // Estimation avec le taux de commission EN VIGUEUR (réglé par l'admin), plus de « 0,95 » en dur
  netEstime = computed(() => Math.round(this.recetteBrute() * (1 - this.platformRate.commissionRate() / 100)));
  peutPublier = computed(() => this.engagementPrefectoral() && this.engagementReversement());

  constructor(
    private eventsService: EventsService,
    private ticketTypesService: TicketTypesService,
    private accessGatesService: AccessGatesService,
    private scannerAgentsService: ScannerAgentsService,
    private router: Router,
    private platformRate: PlatformRateStore
  ) {}

  ngOnInit() {
    this.platformRate.charger();
  }

  // ⚠️ Réécriture complète : avant, on fabriquait tout à la main
  // (Date.now() pour les id, objets complets construits en Angular).
  // Maintenant, chaque étape crée VRAIMENT l'objet côté Django, et on
  // attend sa réponse (avec son vrai id) avant de créer ce qui en dépend.
  async publier() {
    // Un double clic ne doit pas créer deux événements
    if (!this.peutPublier() || this.publicationEnCours()) return;
    this.publicationEnCours.set(true);
    this.erreur.set(null);

    // ⚠️ L'événement est d'abord créé en BROUILLON (invisible du public) et n'est publié qu'en
    // toute dernière étape. Avant, il était public dès sa création : si la création d'une catégorie
    // de billets échouait ensuite, il restait en ligne, à moitié construit, sans billets.
    let etape = "de la création de l'événement";
    let evenementCree = false;

    try {
      // 1. Créer l'événement lui-même, en brouillon
      const nouvelEvenement = await firstValueFrom(
        this.eventsService.creerEvenement({ ...this.brouillon, status: 'draft' })
      );
      evenementCree = true;


      // 2. Créer chaque catégorie de billet, en gardant le lien nom -> vrai id
      etape = 'des catégories de billets';
      const idParNomType = new Map<string, string>();
      for (const draft of this.ticketTypesDraft) {
        const type = await firstValueFrom(
          this.ticketTypesService.creerCategorie(nouvelEvenement.id, {
            name: draft.name,
            price: draft.price,
            quantityTotal: draft.quantityTotal,
            perks: draft.perks,
            isActive: draft.isActive,
          })
        );
        idParNomType.set(draft.name, type.id);
      }

      // 3. Créer chaque porte (étape facultative, peut être vide)
      etape = 'des portes';
      const idParNomPorte = new Map<string, string>();
      for (const porte of this.etape3Draft.gates) {
        const allowedTicketTypeIds = porte.allowedTicketTypeNames
          .map((nom) => idParNomType.get(nom))
          .filter((id): id is string => !!id);

        const gate = await firstValueFrom(
          this.accessGatesService.creerPorte(nouvelEvenement.id, {
            name: porte.name,
            label: porte.label,
            allowedTicketTypeIds,
            estimatedThroughputPerHour: porte.estimatedThroughputPerHour,
          })
        );
        idParNomPorte.set(porte.name, gate.id);
      }

      // 4. Créer chaque agent, relié à sa vraie porte
      etape = 'des agents de scan';
      for (const agent of this.etape3Draft.agents) {
        const gateId = idParNomPorte.get(agent.gateName);
        if (!gateId) continue;

        await firstValueFrom(
          this.scannerAgentsService.creerAgent(nouvelEvenement.id, {
            gate: gateId,
            name: agent.name,
            phone: agent.phone,
            role: agent.role,
          })
        );
      }

      // 5. TOUTE dernière étape : la mise en ligne. Django vérifie que l'événement est prêt.
      etape = 'de la mise en ligne';
      await firstValueFrom(this.eventsService.modifierEvenement(nouvelEvenement.id, { status: 'published' }));

      this.publicationEnCours.set(false);
      this.router.navigate(['/organisateur/evenements', nouvelEvenement.id,'publie']);
    } catch (e) {
      this.publicationEnCours.set(false);
      const detail = this.extraireMessage(e);
      this.erreur.set(
        evenementCree
          ? `La publication s'est arrêtée pendant l'étape « ${etape} »${detail ? ' : ' + detail : ''}. ` +
            `Votre événement a été enregistré en brouillon (invisible du public) : retrouvez-le dans « Mes événements », terminez-le, puis publiez-le.`
          : `La création de l'événement a échoué${detail ? ' : ' + detail : ''}. Vérifiez votre connexion et réessayez.`
      );
    }
  }

  // Le message d'erreur renvoyé par Django (sous plusieurs formes possibles), ou « » si aucun
  private extraireMessage(e: unknown): string {
    const corps = e instanceof HttpErrorResponse ? e.error : null;
    if (!corps || typeof corps !== 'object') return '';
    if (typeof corps.erreur === 'string') return corps.erreur;
    const premier = Object.values(corps).find((v) => typeof v === 'string' || Array.isArray(v));
    return Array.isArray(premier) ? premier.join(' ') : ((premier as string | undefined) ?? '');
  }
}

