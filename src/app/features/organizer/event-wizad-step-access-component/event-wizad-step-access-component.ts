import { Component, OnInit, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventEntity } from '../../../core/models';
import { TicketTypeDraft } from '../event-wizard-step-tickets-component/event-wizard-step-tickets-component';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';



export type ScannerRole = 'operator' | 'supervisor' | 'disputes_manager';

const LABEL_ROLE: Record<ScannerRole, string> = {
  operator: 'Opérateur Scanner',
  supervisor: 'Superviseur Portique',
  disputes_manager: 'Gestionnaire Litiges',
};

// Affiché à la place du code PIN tant que l'agent n'existe pas côté serveur.
// Le VRAI code est généré par Django au moment où l'agent est créé : en
// afficher un autre ici (comme avant) donnait à l'agent un code qui ne
// fonctionnait pas.
export const PIN_A_GENERER = '····';

// Brouillons : pas d'id/eventId tant que l'événement n'est pas réellement créé
// à l'étape 4. Les portes et agents se référencent entre eux par leur nom,
// pas par un id (qui n'existe pas encore).
// En MODIFICATION, une porte ou un agent qui existe déjà côté serveur porte
// son id : c'est ce qui permet de savoir ce qu'il faut créer et ce qu'il faut
// supprimer à l'enregistrement.
export interface AccessGateDraft {
  id?: string;
  name: string;
  label: string;
  allowedTicketTypeNames: string[];
  estimatedThroughputPerHour?: number;
}

export interface ScannerAgentDraft {
  id?: string;
  name: string;
  phone: string;
  role: ScannerRole;
  gateName: string;
  pinCode: string;
}

export interface ParametresSecuriteDraft {
  offlineModeEnabled: boolean;
  antiPassbackEnabled: boolean;
  allowTemporaryExits: boolean;
}

export interface ResultatEtape3 {
  gates: AccessGateDraft[];
  agents: ScannerAgentDraft[];
  security: ParametresSecuriteDraft;
}


@Component({
  imports: [FormsModule, IconComponent, RevealDirective],
  selector: 'app-event-wizad-step-access-component',
  styleUrl: './event-wizad-step-access-component.css',
  templateUrl: './event-wizad-step-access-component.html',
})
export class EventWizardStepAccessComponent implements OnInit {
  @Input({ required: true }) valeursInitiales!: ResultatEtape3;
  @Input({ required: true }) ticketTypesDisponibles!: TicketTypeDraft[];
  @Output() etapeCompletee = new EventEmitter<ResultatEtape3>();
  @Output() retour = new EventEmitter<void>();

  gates = signal<AccessGateDraft[]>([]);
  agents = signal<ScannerAgentDraft[]>([]);

  offlineMode = signal(false);
  antiPassback = signal(false);
  sortiesTemporaires = signal(false);

  get offlineModeModel() { return this.offlineMode(); } set offlineModeModel(v: boolean) { this.offlineMode.set(v); }
  get antiPassbackModel() { return this.antiPassback(); } set antiPassbackModel(v: boolean) { this.antiPassback.set(v); }
  get sortiesTemporairesModel() { return this.sortiesTemporaires(); } set sortiesTemporairesModel(v: boolean) { this.sortiesTemporaires.set(v); }

  // ── Formulaire porte ──
  formulairePorteOuvert = signal(false);
  nomPorte = signal('');
  libellePorte = signal('');
  debitPorte = signal<number | null>(null);
  categoriesSelectionnees = signal<string[]>([]);

  get nomPorteModel() { return this.nomPorte(); } set nomPorteModel(v: string) { this.nomPorte.set(v); }
  get libellePorteModel() { return this.libellePorte(); } set libellePorteModel(v: string) { this.libellePorte.set(v); }
  get debitPorteModel() { return this.debitPorte(); } set debitPorteModel(v: number | null) { this.debitPorte.set(v ? Number(v) : null); }

  // ── Formulaire agent ──
  formulaireAgentOuvert = signal(false);
  nomAgent = signal('');
  telephoneAgent = signal('');
  roleAgent = signal<ScannerRole>('operator');
  portePourAgent = signal('');

  get nomAgentModel() { return this.nomAgent(); } set nomAgentModel(v: string) { this.nomAgent.set(v); }
  get telephoneAgentModel() { return this.telephoneAgent(); } set telephoneAgentModel(v: string) { this.telephoneAgent.set(v); }
  get roleAgentModel() { return this.roleAgent(); } set roleAgentModel(v: ScannerRole) { this.roleAgent.set(v); }
  get portePourAgentModel() { return this.portePourAgent(); } set portePourAgentModel(v: string) { this.portePourAgent.set(v); }

  ngOnInit() {
    this.gates.set(this.valeursInitiales?.gates ?? []);
    this.agents.set(this.valeursInitiales?.agents ?? []);
    this.offlineMode.set(this.valeursInitiales?.security?.offlineModeEnabled ?? false);
    this.antiPassback.set(this.valeursInitiales?.security?.antiPassbackEnabled ?? false);
    this.sortiesTemporaires.set(this.valeursInitiales?.security?.allowTemporaryExits ?? false);
  }

  labelRole(role: ScannerRole): string {
    return LABEL_ROLE[role];
  }

  toggleCategorie(nom: string) {
    this.categoriesSelectionnees.update((liste) =>
      liste.includes(nom) ? liste.filter((c) => c !== nom) : [...liste, nom]
    );
  }

  ajouterPorte() {
    if (!this.nomPorte().trim() || !this.libellePorte().trim()) return;
    this.gates.update((liste) => [
      ...liste,
      {
        name: this.nomPorte(),
        label: this.libellePorte(),
        allowedTicketTypeNames: this.categoriesSelectionnees(),
        estimatedThroughputPerHour: this.debitPorte() ?? undefined,
      },
    ]);
    this.nomPorte.set('');
    this.libellePorte.set('');
    this.debitPorte.set(null);
    this.categoriesSelectionnees.set([]);
    this.formulairePorteOuvert.set(false);
  }

  supprimerPorte(index: number) {
    this.gates.update((liste) => liste.filter((_, i) => i !== index));
  }

  ajouterAgent() {
    if (!this.nomAgent().trim() || !this.telephoneAgent().trim() || !this.portePourAgent()) return;
    this.agents.update((liste) => [
      ...liste,
      {
        name: this.nomAgent(),
        phone: this.telephoneAgent(),
        role: this.roleAgent(),
        gateName: this.portePourAgent(),
        // Le vrai code n'existe pas encore : Django le génère à la création.
        pinCode: PIN_A_GENERER,
      },
    ]);
    this.nomAgent.set('');
    this.telephoneAgent.set('');
    this.roleAgent.set('operator');
    this.formulaireAgentOuvert.set(false);
  }

  supprimerAgent(index: number) {
    this.agents.update((liste) => liste.filter((_, i) => i !== index));
  }

  // Ouvre WhatsApp avec un message pré-rempli, comme pour le partage de billet
  // — pas de vrai SMS automatisé sans backend.
  // Un agent qui n'existe pas encore côté serveur n'a pas de vrai code : on
  // l'explique plutôt que d'envoyer un code qui ne marcherait pas.
  envoyerParWhatsApp(agent: ScannerAgentDraft) {
    if (!agent.id) {
      window.alert("Le code PIN de cet agent sera généré à l'enregistrement. Vous pourrez l'envoyer par WhatsApp juste après.");
      return;
    }
    const texte = `Bonjour ${agent.name}, voici votre code PIN Kcrowd Scanner pour la porte ${agent.gateName} : ${agent.pinCode}. Téléchargez l'application Kcrowd Scanner et entrez ce code pour commencer.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank');
  }

  private construireResultat(): ResultatEtape3 {
    return {
      gates: this.gates(),
      agents: this.agents(),
      security: {
        offlineModeEnabled: this.offlineMode(),
        antiPassbackEnabled: this.antiPassback(),
        allowTemporaryExits: this.sortiesTemporaires(),
      },
    };
  }

  passerCetteEtape() {
    this.etapeCompletee.emit(this.construireResultat());
  }

  continuer() {
    this.etapeCompletee.emit(this.construireResultat());
  }
}

