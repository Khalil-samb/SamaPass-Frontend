import { Component, EventEmitter, Input, OnInit, Output, computed, signal } from '@angular/core';
import { EventEntity } from '../../../core/models';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';


// Un type de billet "en préparation". À la création, il n'a ni id ni eventId
// (l'événement n'existe pas encore). En MODIFICATION, un billet qui existe déjà
// côté serveur porte son id et son nombre de ventes — c'est ce qui permet de
// distinguer "à modifier" de "à créer", et de protéger les billets déjà vendus.
export interface TicketTypeDraft {
  id?: string;
  quantitySold?: number;
  name: string;
  price: number;
  quantityTotal: number;
  perks: string[];
  isActive: boolean;
}

export interface ResultatEtape2 {
  ticketTypes: TicketTypeDraft[];
  eventPatch: Partial<EventEntity>;
}

// 'YYYY-MM-DDTHH:mm' en heure locale à partir d'une date ISO du serveur — le SEUL format qu'accepte le champ
// « date et heure » (datetime-local). Avant, cette fonction ne renvoyait que 'YYYY-MM-DD' : le champ la
// refusait et s'affichait VIDE, si bien qu'un organisateur qui rouvrait son événement ne voyait pas sa date de
// clôture (et ne pouvait pas deviner pourquoi ses ventes étaient fermées).
function dateLocale(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) return iso; // déjà au format du champ
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`; // date seule : minuit local (pas de glissement de fuseau)
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  imports: [FormsModule, IconComponent, RevealDirective],
  selector: 'app-event-wizard-step-tickets-component',
  styleUrl: './event-wizard-step-tickets-component.css',
  templateUrl: './event-wizard-step-tickets-component.html',
})
export class EventWizardStepTicketsComponent implements OnInit {
  @Input({ required: true }) valeursInitiales!: TicketTypeDraft[];
  // Réglages de vente déjà enregistrés (mode modification uniquement). Sans
  // eux, ces champs repartaient à leurs valeurs par défaut et écrasaient les
  // vrais réglages de l'événement à l'enregistrement.
  @Input() reglagesInitiaux?: Partial<EventEntity>;
  @Output() etapeCompletee = new EventEmitter<ResultatEtape2>();
  @Output() retour = new EventEmitter<void>();

  ticketTypes = signal<TicketTypeDraft[]>([]);
  erreurValidation = signal<string | null>(null);

  // ── Formulaire d'ajout/édition ──
  formulaireOuvert = signal(false);
  indexEnEdition = signal<number | null>(null);
  nomForm = signal('');
  prixForm = signal(0);
  quotaForm = signal(0);
  perksForm = signal<string[]>([]);
  nouveauPerk = signal('');

  get nomFormModel() { return this.nomForm(); } set nomFormModel(v: string) { this.nomForm.set(v); }
  get prixFormModel() { return this.prixForm(); } set prixFormModel(v: number) { this.prixForm.set(Number(v)); }
  get quotaFormModel() { return this.quotaForm(); } set quotaFormModel(v: number) { this.quotaForm.set(Number(v)); }
  get nouveauPerkModel() { return this.nouveauPerk(); } set nouveauPerkModel(v: string) { this.nouveauPerk.set(v); }

  // ── Conditions de vente ──
  maxParAchat = signal(6);
  dateClotureVentes = signal('');
  paiementWave = signal(true);
  paiementOM = signal(true);
  paiementFreeMoney = signal(false);
  paiementCarte = signal(true);

  // Date de clôture d'origine (modification) et ce que le champ affichait au
  // départ : tant que la personne n'y touche pas, on renvoie l'originale
  // intacte plutôt qu'une version reformatée.
  private salesCloseAtOrigine?: string;
  private dateClotureAffichee = '';

  get maxParAchatModel() { return this.maxParAchat(); } set maxParAchatModel(v: number) { this.maxParAchat.set(Number(v)); }
  get dateClotureVentesModel() { return this.dateClotureVentes(); } set dateClotureVentesModel(v: string) { this.dateClotureVentes.set(v); }
  get paiementWaveModel() { return this.paiementWave(); } set paiementWaveModel(v: boolean) { this.paiementWave.set(v); }
  get paiementOMModel() { return this.paiementOM(); } set paiementOMModel(v: boolean) { this.paiementOM.set(v); }
  get paiementFreeMoneyModel() { return this.paiementFreeMoney(); } set paiementFreeMoneyModel(v: boolean) { this.paiementFreeMoney.set(v); }
  get paiementCarteModel() { return this.paiementCarte(); } set paiementCarteModel(v: boolean) { this.paiementCarte.set(v); }

  // ── Commission Kcrowd ──
  //  Le choix « frais à la charge de l'acheteur » a été RETIRÉ : il n'avait aucun effet. L'acheteur paie
  // toujours exactement le prix affiché, et la commission est toujours déduite du reversement de
  // l'organisateur. Proposer le contraire lui promettait une chose fausse (« le client paiera 10 500 FCFA »).
  tauxCommission = computed(() => this.platformRate.commissionRate());

  // Exemple chiffré avec le taux RÉEL, pour un billet de 10 000 FCFA
  exemple = computed(() => {
    const prix = 10000;
    const commission = Math.round((prix * this.tauxCommission()) / 100);
    return { prix, commission, net: prix - commission };
  });

  constructor(private platformRate: PlatformRateStore) {}

  ngOnInit() {
    this.platformRate.charger();
    this.ticketTypes.set(this.valeursInitiales ?? []);

    const r = this.reglagesInitiaux;
    if (r) {
      if (r.maxTicketsPerPurchase) this.maxParAchat.set(r.maxTicketsPerPurchase);
      if (Array.isArray(r.acceptedPaymentMethods)) {
        const m = r.acceptedPaymentMethods;
        this.paiementWave.set(m.includes('wave'));
        this.paiementOM.set(m.includes('orange_money'));
        this.paiementFreeMoney.set(m.includes('free_money'));
        this.paiementCarte.set(m.includes('card'));
      }
      if (r.salesCloseAt) {
        this.salesCloseAtOrigine = r.salesCloseAt;
        this.dateClotureAffichee = dateLocale(r.salesCloseAt);
        this.dateClotureVentes.set(this.dateClotureAffichee);
      }
    }
  }

  ouvrirAjout() {
    this.indexEnEdition.set(null);
    this.nomForm.set('');
    this.prixForm.set(0);
    this.quotaForm.set(0);
    this.perksForm.set([]);
    this.formulaireOuvert.set(true);
  }

  ouvrirEdition(index: number) {
    const t = this.ticketTypes()[index];
    this.indexEnEdition.set(index);
    this.nomForm.set(t.name);
    this.prixForm.set(t.price);
    this.quotaForm.set(t.quantityTotal);
    this.perksForm.set([...t.perks]);
    this.formulaireOuvert.set(true);
  }

  ajouterPerk() {
    const valeur = this.nouveauPerk().trim();
    if (!valeur) return;
    this.perksForm.update((liste) => [...liste, valeur]);
    this.nouveauPerk.set('');
  }

  retirerPerk(perk: string) {
    this.perksForm.update((liste) => liste.filter((p) => p !== perk));
  }

  enregistrerCategorie() {
    if (!this.nomForm().trim() || this.prixForm() <= 0 || this.quotaForm() <= 0) {
      this.erreurValidation.set('Nom, prix et quota sont obligatoires pour cette catégorie.');
      return;
    }

    const index = this.indexEnEdition();
    const existante = index !== null ? this.ticketTypes()[index] : null;

    // Un quota ne peut pas descendre sous le nombre de billets déjà vendus
    // (Django le refuse aussi : ici on prévient simplement plus tôt).
    if (existante?.quantitySold && this.quotaForm() < existante.quantitySold) {
      this.erreurValidation.set(`Le quota ne peut pas être inférieur aux ${existante.quantitySold} billets déjà vendus.`);
      return;
    }
    this.erreurValidation.set(null);

    // En modification d'un billet existant, on CONSERVE son identité (id,
    // ventes, état actif) : sans ça, il serait traité comme un nouveau billet
    // et l'ancien serait supprimé.
    const nouvelleCategorie: TicketTypeDraft = {
      ...(existante ?? {}),
      name: this.nomForm(),
      price: this.prixForm(),
      quantityTotal: this.quotaForm(),
      perks: this.perksForm(),
      isActive: existante?.isActive ?? true,
    };

    if (index !== null) {
      this.ticketTypes.update((liste) => liste.map((t, i) => (i === index ? nouvelleCategorie : t)));
    } else {
      this.ticketTypes.update((liste) => [...liste, nouvelleCategorie]);
    }
    this.formulaireOuvert.set(false);
  }

  supprimerCategorie(index: number) {
    const t = this.ticketTypes()[index];
    if (t?.quantitySold && t.quantitySold > 0) {
      this.erreurValidation.set(`« ${t.name} » a déjà ${t.quantitySold} billet(s) vendu(s) : elle ne peut pas être supprimée. Vous pouvez modifier son prix ou son quota.`);
      return;
    }
    this.erreurValidation.set(null);
    this.ticketTypes.update((liste) => liste.filter((_, i) => i !== index));
  }

  private salesCloseAtAEmettre(): string | undefined {
    const saisie = this.dateClotureVentes();
    if (!saisie) return undefined;
    if (this.salesCloseAtOrigine && saisie === this.dateClotureAffichee) return this.salesCloseAtOrigine;
    return saisie;
  }

  continuer() {
    if (this.ticketTypes().length === 0) {
      this.erreurValidation.set('Ajoutez au moins une catégorie de billet avant de continuer (même une seule, pour un événement à entrée unique).');
      return;
    }

    // Une date de clôture NOUVELLE ou modifiée doit être à venir (Django le refuse aussi) : sinon, les ventes
    // seraient fermées dès la publication. Une date d'origine laissée telle quelle n'est pas revérifiée.
    const cloture = this.salesCloseAtAEmettre();
    if (cloture !== undefined && cloture !== this.salesCloseAtOrigine && new Date(cloture).getTime() <= Date.now()) {
      this.erreurValidation.set('La date de clôture des ventes est déjà passée : les ventes seraient fermées dès maintenant. Choisissez une date à venir, ou videz le champ.');
      return;
    }
    this.erreurValidation.set(null);

    const acceptedPaymentMethods: string[] = [];
    if (this.paiementWave()) acceptedPaymentMethods.push('wave');
    if (this.paiementOM()) acceptedPaymentMethods.push('orange_money');
    if (this.paiementFreeMoney()) acceptedPaymentMethods.push('free_money');
    if (this.paiementCarte()) acceptedPaymentMethods.push('card');

    this.etapeCompletee.emit({
      ticketTypes: this.ticketTypes(),
      eventPatch: {
        maxTicketsPerPurchase: this.maxParAchat(),
        salesCloseAt: this.salesCloseAtAEmettre(),
        // Toujours « organisateur » : c'est la réalité de ce qui est prélevé. Un ancien événement enregistré
        // avec « acheteur » (choix qui n'a jamais eu d'effet) est remis d'équerre à son prochain enregistrement.
        feesBornBy: 'organizer',
        acceptedPaymentMethods,
      },
    });
  }
}

