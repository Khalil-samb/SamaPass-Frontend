import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, forkJoin } from 'rxjs';

import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { EventsService } from '../../../core/services/events.service';
import { TicketTypesService } from '../../../core/services/ticket-types.service';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { ScannerAgentsService } from '../../../core/services/scanner-agents.service';
import { EventEntity } from '../../../core/models/event.model';
import { SelectedEventStore } from '../../../core/state/selected-event.store';

import { EventWizardStepInfoComponent } from '../event-wizard-step-info-component/event-wizard-step-info-component';
import {
  EventWizardStepTicketsComponent,
  ResultatEtape2,
  TicketTypeDraft,
} from '../event-wizard-step-tickets-component/event-wizard-step-tickets-component';
import {
  EventWizardStepAccessComponent,
  PIN_A_GENERER,
  ResultatEtape3,
  ScannerRole,
} from '../event-wizad-step-access-component/event-wizad-step-access-component';

// Ce que renvoie réellement Django (clés déjà converties en camelCase).
interface TypeServeur {
  id: string; name: string; price: number; quantityTotal: number;
  quantitySold: number; perks: string[]; isActive: boolean;
}
interface PorteServeur {
  id: string; name: string; label: string;
  allowedTicketTypeIds: string[]; estimatedThroughputPerHour: number | null;
}
interface AgentServeur {
  id: string; gate: string; name: string; phone: string; role: ScannerRole; pinCode: string;
}
// Photo de l'état du serveur au chargement : sert de point de comparaison
// pour savoir, à l'enregistrement, ce qui est nouveau, modifié ou retiré.
interface Instantane { types: TypeServeur[]; portes: PorteServeur[]; agents: AgentServeur[]; }

// Un agent créé pendant cet enregistrement, avec son VRAI code PIN (celui de Django).
export interface NouvelAgentCree { name: string; gateName: string; pinCode: string; }

const LIBELLE_STATUT: Record<string, { texte: string; classes: string }> = {
  draft: { texte: 'Brouillon', classes: 'bg-slate-200 text-slate-700' },
  published: { texte: 'Publié', classes: 'bg-emerald-100 text-emerald-700' },
  sold_out: { texte: 'Complet', classes: 'bg-amber-100 text-amber-800' },
  finished: { texte: 'Terminé', classes: 'bg-slate-200 text-slate-700' },
  cancelled: { texte: 'Annulé', classes: 'bg-red-100 text-red-700' },
};

const LIBELLE_ROLE: Record<ScannerRole, string> = {
  operator: 'Opérateur Scanner',
  supervisor: 'Superviseur Portique',
  disputes_manager: 'Gestionnaire Litiges',
};

@Component({
  imports: [RouterLink, RevealDirective, EventWizardStepInfoComponent, EventWizardStepTicketsComponent, EventWizardStepAccessComponent],
  standalone: true,
  selector: 'app-event-edit-component',
  styleUrl: './event-edit-component.css',
  templateUrl: './event-edit-component.html',
})
export class EventEditComponent implements OnInit {
  chargement = signal(true);
  introuvable = signal(false);
  erreurChargement = signal<string | null>(null);

  etapeActuelle = signal(1);
  brouillon = signal<Partial<EventEntity>>({});
  ticketTypesDraft = signal<TicketTypeDraft[]>([]);
  etape3Draft = signal<ResultatEtape3>({
    gates: [],
    agents: [],
    security: { offlineModeEnabled: false, antiPassbackEnabled: false, allowTemporaryExits: false },
  });
  private instantane = signal<Instantane | null>(null);

  enregistrementEnCours = signal(false);
  erreur = signal<string | null>(null);
  // Renseigné après un enregistrement qui a créé des agents : l'écran affiche
  // alors leurs vrais codes PIN, à envoyer par WhatsApp.
  nouveauxAgents = signal<NouvelAgentCree[]>([]);
  enregistre = signal(false);

  // ── Publication d'un brouillon ──
  // Les mêmes engagements que ceux de l'assistant de création : publier engage l'organisateur.
  engagementPrefectoral = signal(false);
  engagementReversement = signal(false);
  messageStatut = signal<string | null>(null);

  statut = computed(() => this.brouillon().status ?? 'draft');
  estBrouillon = computed(() => this.statut() === 'draft');
  peutPublier = computed(() => this.estBrouillon() && this.engagementPrefectoral() && this.engagementReversement());
  // Aucune vente : seul cas où repasser en brouillon est permis (Django le refuse sinon)
  aDesVentes = computed(() => this.ticketTypesDraft().some((t) => (t.quantitySold ?? 0) > 0));
  peutRepasserEnBrouillon = computed(() => this.statut() === 'published' && !this.aDesVentes());
  libelleStatut = computed(() => LIBELLE_STATUT[this.statut()]?.texte ?? this.statut());
  classesStatut = computed(() => LIBELLE_STATUT[this.statut()]?.classes ?? 'bg-slate-100 text-slate-600');

  private eventId!: string;

  etapes = [
    { numero: 1, titre: 'Informations & Lieu' },
    { numero: 2, titre: 'Billetterie & Tarifs' },
    { numero: 3, titre: 'Contrôle & Accès' },
    { numero: 4, titre: 'Récapitulatif & Enreg.' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private ticketTypesService: TicketTypesService,
    private accessGatesService: AccessGatesService,
    private scannerAgentsService: ScannerAgentsService,
    private eventStore: SelectedEventStore
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.chargement.set(false);
      this.introuvable.set(true);
      return;
    }
    this.eventId = id;
    this.charger();
  }

  // État d'une étape dans la barre de progression
  statutEtape(numero: number): 'faite' | 'actuelle' | 'avenir' {
    if (numero < this.etapeActuelle()) return 'faite';
    if (numero === this.etapeActuelle()) return 'actuelle';
    return 'avenir';
  }

  libelleRole(role: ScannerRole): string {
    return LIBELLE_ROLE[role];
  }

  // ═══════════════ Chargement ═══════════════

  private charger() {
    this.chargement.set(true);
    this.introuvable.set(false);
    this.erreurChargement.set(null);

    forkJoin({
      evenement: this.eventsService.getMonEvenement(this.eventId),
      types: this.ticketTypesService.getMesCategories(this.eventId),
      portes: this.accessGatesService.getByEvent(this.eventId),
      agents: this.scannerAgentsService.getByEvent(this.eventId),
    }).subscribe({
      next: ({ evenement, types, portes, agents }) =>
        this.initialiser(
          evenement,
          types as unknown as TypeServeur[],
          portes as unknown as PorteServeur[],
          agents as unknown as AgentServeur[]
        ),
      error: (e: HttpErrorResponse) => {
        // 404 : l'événement n'existe pas, OU il appartient à quelqu'un d'autre
        // (Django ne fait volontairement pas la différence).
        this.introuvable.set(e.status === 404);
        if (e.status !== 404) this.erreurChargement.set("Impossible de charger l'événement. Vérifiez votre connexion et réessayez.");
        this.chargement.set(false);
      },
    });
  }

  private initialiser(evenement: EventEntity, types: TypeServeur[], portes: PorteServeur[], agents: AgentServeur[]) {
    this.instantane.set({ types, portes, agents });
    this.brouillon.set(evenement);

    this.ticketTypesDraft.set(
      types.map((t) => ({
        id: t.id,
        quantitySold: t.quantitySold,
        name: t.name,
        price: t.price,
        quantityTotal: t.quantityTotal,
        perks: t.perks ?? [],
        isActive: t.isActive,
      }))
    );

    const nomTypeParId = new Map(types.map((t) => [t.id, t.name]));
    const nomPorteParId = new Map(portes.map((p) => [p.id, p.name]));

    this.etape3Draft.set({
      gates: portes.map((p) => ({
        id: p.id,
        name: p.name,
        label: p.label,
        // Un identifiant qui ne correspond plus à aucun billet est ignoré
        allowedTicketTypeNames: (p.allowedTicketTypeIds ?? [])
          .map((idType) => nomTypeParId.get(idType))
          .filter((nom): nom is string => !!nom),
        estimatedThroughputPerHour: p.estimatedThroughputPerHour ?? undefined,
      })),
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        role: a.role,
        gateName: nomPorteParId.get(a.gate) ?? '',
        pinCode: a.pinCode,
      })),
      security: {
        offlineModeEnabled: evenement.offlineModeEnabled,
        antiPassbackEnabled: evenement.antiPassbackEnabled,
        allowTemporaryExits: evenement.allowTemporaryExits,
      },
    });

    this.etapeActuelle.set(1);
    this.chargement.set(false);
  }

  // ═══════════════ Navigation entre les étapes ═══════════════

  onEtape1Terminee(patch: Partial<EventEntity>) {
    this.brouillon.update((b) => ({ ...b, ...patch }));
    this.etapeActuelle.set(2);
  }

  onEtape2Terminee(resultat: ResultatEtape2) {
    // Les portes désignent leurs billets par NOM. Si un billet vient d'être
    // renommé (on le reconnaît à son id) ou supprimé, les portes doivent suivre,
    // sinon elles perdraient ce billet sans prévenir.
    const anciens = this.ticketTypesDraft();
    const renommages = new Map<string, string>();
    for (const t of resultat.ticketTypes) {
      if (!t.id) continue;
      const ancien = anciens.find((a) => a.id === t.id);
      if (ancien && ancien.name !== t.name) renommages.set(ancien.name, t.name);
    }
    const nomsValides = new Set(resultat.ticketTypes.map((t) => t.name));

    this.etape3Draft.update((d) => ({
      ...d,
      gates: d.gates.map((g) => ({
        ...g,
        allowedTicketTypeNames: g.allowedTicketTypeNames
          .map((nom) => renommages.get(nom) ?? nom)
          .filter((nom) => nomsValides.has(nom)),
      })),
    }));

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

  // ═══════════════ Comparaison ancien / nouveau ═══════════════

  private typeChange(avant: TypeServeur, apres: TicketTypeDraft): boolean {
    return (
      avant.name !== apres.name ||
      avant.price !== apres.price ||
      avant.quantityTotal !== apres.quantityTotal ||
      avant.isActive !== apres.isActive ||
      (avant.perks ?? []).join('|') !== apres.perks.join('|')
    );
  }

  private memesIds(a: string[], b: string[]): boolean {
    return a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
  }

  // Les agents dont la porte a été retirée disparaissent avec elle.
  private agentsConserves() {
    const nomsPortes = new Set(this.etape3Draft().gates.map((g) => g.name));
    return this.etape3Draft().agents.filter((a) => nomsPortes.has(a.gateName));
  }

  resume = computed(() => {
    const inst = this.instantane();
    if (!inst) return null;
    const types = this.ticketTypesDraft();
    const portes = this.etape3Draft().gates;
    const conserves = this.agentsConserves();
    const idsAgents = new Set(conserves.map((a) => a.id).filter(Boolean));

    return {
      typesNouveaux: types.filter((t) => !t.id).length,
      typesModifies: types.filter((t) => t.id && inst.types.some((a) => a.id === t.id && this.typeChange(a, t))).length,
      typesSupprimes: inst.types.filter((a) => !types.some((t) => t.id === a.id)).length,
      portesNouvelles: portes.filter((p) => !p.id).length,
      portesSupprimees: inst.portes.filter((a) => !portes.some((p) => p.id === a.id)).length,
      agentsNouveaux: conserves.filter((a) => !a.id).length,
      agentsSupprimes: inst.agents.filter((a) => !idsAgents.has(a.id)).length,
    };
  });

  aDesChangementsStructure = computed(() => {
    const r = this.resume();
    return !!r && Object.values(r).some((n) => n > 0);
  });

  // ═══════════════ Enregistrement ═══════════════

  // Vérifications faites AVANT d'envoyer quoi que ce soit : mieux vaut refuser
  // clairement au départ qu'échouer à mi-chemin avec la moitié des changements
  // déjà appliquée. (Django refuse aussi ces cas : ici on prévient simplement.)
  private verifierAvantEnregistrement(): string | null {
    const inst = this.instantane();
    if (!inst) return 'Données non chargées.';
    const types = this.ticketTypesDraft();
    const portes = this.etape3Draft().gates;

    const doublon = (noms: string[]) => noms.find((n, i) => noms.indexOf(n) !== i);
    const typeDouble = doublon(types.map((t) => t.name.trim().toLowerCase()));
    if (typeDouble) return `Deux catégories de billets portent le même nom (« ${typeDouble} »). Donnez-leur des noms différents.`;
    const porteDouble = doublon(portes.map((p) => p.name.trim().toLowerCase()));
    if (porteDouble) return `Deux portes portent le même nom (« ${porteDouble} »). Donnez-leur des noms différents.`;

    for (const avant of inst.types) {
      const apres = types.find((t) => t.id === avant.id);
      if (!apres && avant.quantitySold > 0) {
        return `« ${avant.name} » a déjà ${avant.quantitySold} billet(s) vendu(s) : elle ne peut pas être supprimée.`;
      }
      if (apres && apres.quantityTotal < avant.quantitySold) {
        return `Le quota de « ${apres.name} » ne peut pas être inférieur aux ${avant.quantitySold} billets déjà vendus.`;
      }
    }
    return null;
  }

  // Uniquement les champs que cet écran permet de modifier — jamais l'objet
  // entier (on n'envoie donc ni statut, ni notes, ni rien d'autre par erreur).
  // `null` (et non undefined) pour les champs facultatifs vidés : undefined est
  // simplement ignoré à l'envoi, et la valeur d'origine resterait en place.
  private construirePayloadEvenement(): Partial<EventEntity> {
    const b = this.brouillon();
    const payload: Record<string, unknown> = {
      title: b.title,
      description: b.description,
      categoryId: b.categoryId,
      experienceFormat: b.experienceFormat ?? null,
      cityId: b.cityId,
      venue: b.venue,
      address: b.address ?? '',
      startDate: b.startDate,
      endDate: b.endDate,
      doorsOpenTime: b.doorsOpenTime ?? null,
      coverImageUrl: b.coverImageUrl,
      bannerImageUrl: b.bannerImageUrl ?? null,
      teaserVideoUrl: b.teaserVideoUrl ?? null,
      lineup: b.lineup ?? [],
      maxCapacity: b.maxCapacity,
      maxTicketsPerPurchase: b.maxTicketsPerPurchase ?? null,
      salesCloseAt: b.salesCloseAt ?? null,
      feesBornBy: b.feesBornBy,
      acceptedPaymentMethods: b.acceptedPaymentMethods ?? [],
      offlineModeEnabled: b.offlineModeEnabled ?? false,
      antiPassbackEnabled: b.antiPassbackEnabled ?? false,
      allowTemporaryExits: b.allowTemporaryExits ?? false,
    };
    return payload as unknown as Partial<EventEntity>;
  }

  // Une suppression déjà faite (404) n'est pas une erreur : c'est ce qui arrive
  // à un agent supprimé en même temps que sa porte.
  private async supprimerTolerant(requete: () => Promise<unknown>) {
    try {
      await requete();
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) throw e;
    }
  }

  private extraireMessage(e: unknown): string {
    const corps = e instanceof HttpErrorResponse ? e.error : null;
    if (!corps || typeof corps !== 'object') return '';
    if (typeof corps.erreur === 'string') return corps.erreur;
    const premier = Object.values(corps).find((v) => typeof v === 'string' || Array.isArray(v));
    return Array.isArray(premier) ? premier.join(' ') : ((premier as string | undefined) ?? '');
  }

  // publier = true : après avoir enregistré TOUT le reste, publie l'événement (dernière étape)
  // Les diminutions de quota passent AVANT les augmentations et les créations : Django vérifie la jauge à chaque
  // enregistrement, une augmentation ne doit pas être refusée parce qu'une diminution n'est pas encore faite.
  private ordreEnregistrementTypes<T extends { id?: string; quantityTotal: number }>(
    types: T[],
    avant: { id: string; quantityTotal: number }[]
  ): T[] {
    const variation = (t: T) => t.quantityTotal - (avant.find((a) => a.id === t.id)?.quantityTotal ?? 0);
    return [...types].sort((a, b) => variation(a) - variation(b));
  }

  async enregistrer(publier = false) {
    if (this.enregistrementEnCours()) return;
    // Les engagements sont vérifiés ICI aussi, pas seulement par le bouton désactivé
    if (publier && !this.peutPublier()) return;

    const probleme = this.verifierAvantEnregistrement();
    if (probleme) {
      this.erreur.set(probleme);
      return;
    }

    this.enregistrementEnCours.set(true);
    this.erreur.set(null);

    const inst = this.instantane()!;
    const types = this.ticketTypesDraft();
    const portes = this.etape3Draft().gates;
    const conserves = this.agentsConserves();
    const id = this.eventId;
    let etape = "des informations de l'événement";

    try {
      // 1. L'événement lui-même
      await firstValueFrom(this.eventsService.modifierEvenement(id, this.construirePayloadEvenement()));

      // 2. Catégories de billets : créer les nouvelles, modifier celles qui ont changé
      etape = 'des catégories de billets';
      const idParNomType = new Map<string, string>();
      for (const t of this.ordreEnregistrementTypes(types, inst.types)) {
        if (!t.id) {
          const cree = await firstValueFrom(
            this.ticketTypesService.creerCategorie(id, {
              name: t.name, price: t.price, quantityTotal: t.quantityTotal, perks: t.perks, isActive: t.isActive,
            })
          );
          idParNomType.set(t.name, cree.id);
        } else {
          idParNomType.set(t.name, t.id);
          const avant = inst.types.find((a) => a.id === t.id);
          if (avant && this.typeChange(avant, t)) {
            await firstValueFrom(
              this.ticketTypesService.modifierCategorie(id, t.id, {
                name: t.name, price: t.price, quantityTotal: t.quantityTotal, perks: t.perks, isActive: t.isActive,
              })
            );
          }
        }
      }

      // 3. Portes : créer les nouvelles, mettre à jour les billets acceptés si besoin
      etape = 'des portes';
      const idParNomPorte = new Map<string, string>();
      for (const p of portes) {
        const idsAutorises = p.allowedTicketTypeNames
          .map((nom) => idParNomType.get(nom))
          .filter((x): x is string => !!x);

        if (!p.id) {
          const creee = await firstValueFrom(
            this.accessGatesService.creerPorte(id, {
              name: p.name, label: p.label, allowedTicketTypeIds: idsAutorises,
              estimatedThroughputPerHour: p.estimatedThroughputPerHour,
            })
          );
          idParNomPorte.set(p.name, creee.id);
        } else {
          idParNomPorte.set(p.name, p.id);
          const avant = inst.portes.find((a) => a.id === p.id);
          if (avant && !this.memesIds(avant.allowedTicketTypeIds ?? [], idsAutorises)) {
            await firstValueFrom(this.accessGatesService.modifierPorte(id, p.id, { allowedTicketTypeIds: idsAutorises }));
          }
        }
      }

      // 4. Nouveaux agents : le VRAI code PIN est celui que Django renvoie
      etape = 'des agents de scan';
      const crees: NouvelAgentCree[] = [];
      for (const a of conserves) {
        if (a.id) continue; // un agent existant n'est pas modifiable depuis cet écran
        const cree = (await firstValueFrom(
          this.scannerAgentsService.creerAgent(id, {
            gate: idParNomPorte.get(a.gateName)!, name: a.name, phone: a.phone, role: a.role,
          })
        )) as unknown as AgentServeur;
        crees.push({ name: a.name, gateName: a.gateName, pinCode: cree.pinCode });
      }

      // 5. Suppressions, dans cet ordre précis : agents, puis portes (qui
      //    emporteraient leurs agents), puis billets (que les portes ne
      //    référencent plus à ce stade).
      etape = 'des suppressions';
      const idsAgentsGardes = new Set(conserves.map((a) => a.id).filter(Boolean));
      for (const avant of inst.agents) {
        if (!idsAgentsGardes.has(avant.id)) {
          await this.supprimerTolerant(() => firstValueFrom(this.scannerAgentsService.supprimerAgent(id, avant.id)));
        }
      }
      const idsPortesGardees = new Set(portes.map((p) => p.id).filter(Boolean));
      for (const avant of inst.portes) {
        if (!idsPortesGardees.has(avant.id)) {
          await this.supprimerTolerant(() => firstValueFrom(this.accessGatesService.supprimerPorte(id, avant.id)));
        }
      }
      const idsTypesGardes = new Set(types.map((t) => t.id).filter(Boolean));
      for (const avant of inst.types) {
        if (!idsTypesGardes.has(avant.id)) {
          await this.supprimerTolerant(() => firstValueFrom(this.ticketTypesService.supprimerCategorie(id, avant.id)));
        }
      }

      // 6. Publication, TOUTE dernière étape : si Django la refuse (événement pas prêt), tout le
      //    reste est déjà enregistré et l'événement reste simplement un brouillon.
      if (publier) {
        etape = 'de la publication';
        await firstValueFrom(this.eventsService.modifierEvenement(id, { status: 'published' }));
      }

      // La liste « Mes événements » lit le store : on le met à jour AVANT d'y
      // retourner, sinon elle afficherait un instant les anciens chiffres
      // (ancien statut « Complet », ancien nombre de billets).
      await this.eventStore.rafraichir();

      this.enregistrementEnCours.set(false);
      if (publier) {
        // La page de lancement montre les liens de partage ET les codes PIN de TOUS les agents
        this.router.navigate(['/organisateur/evenements', id, 'publie']);
        return;
      }
      if (crees.length > 0) {
        this.nouveauxAgents.set(crees);
        this.enregistre.set(true);
      } else {
        this.router.navigate(['/organisateur/evenements']);
      }
    } catch (e) {
      this.enregistrementEnCours.set(false);
      const detail = this.extraireMessage(e);
      // Une partie des changements a pu être appliquée avant la panne : le store aussi doit le savoir.
      void this.eventStore.rafraichir();
      // Rien ne permet d'annuler ce qui a déjà été enregistré (ce sont des
      // appels séparés). On recharge donc l'état RÉEL du serveur : l'écran
      // reflète la vérité, et rejouer l'enregistrement ne crée pas de doublons.
      this.charger();
      this.erreur.set(
        etape === 'de la publication'
          ? `Vos modifications sont enregistrées, mais l'événement n'a pas pu être publié${detail ? ' : ' + detail : ''}`
          : `L'enregistrement s'est arrêté pendant l'étape « ${etape} »${detail ? ' : ' + detail : ''}. ` +
            `Ce qui précède a été enregistré. L'écran vient d'être rechargé avec l'état réel : vérifiez-le, puis refaites le reste.`
      );
    }
  }

  // Un événement publié SANS aucune vente peut redevenir un brouillon (Django vérifie aussi).
  async repasserEnBrouillon() {
    if (this.enregistrementEnCours() || !this.peutRepasserEnBrouillon()) return;
    if (!window.confirm("Repasser cet événement en brouillon ? Il ne sera plus visible du public ni achetable tant que vous ne l'aurez pas republié.")) return;

    this.enregistrementEnCours.set(true);
    this.erreur.set(null);
    this.messageStatut.set(null);
    try {
      await firstValueFrom(this.eventsService.modifierEvenement(this.eventId, { status: 'draft' }));
      this.brouillon.update((b) => ({ ...b, status: 'draft' }));
      void this.eventStore.rafraichir();
      this.messageStatut.set("L'événement est repassé en brouillon : il n'est plus visible du public.");
    } catch (e) {
      this.erreur.set(this.extraireMessage(e) || 'Le changement de statut a échoué. Réessayez.');
    } finally {
      this.enregistrementEnCours.set(false);
    }
  }

  // Envoie à un agent qu'on vient de créer son VRAI code, par WhatsApp.
  envoyerCodeParWhatsApp(agent: NouvelAgentCree) {
    if (agent.pinCode === PIN_A_GENERER) return;
    const texte = `Bonjour ${agent.name}, voici votre code PIN Kcrowd Scanner pour la porte ${agent.gateName} : ${agent.pinCode}. Téléchargez l'application Kcrowd Scanner et entrez ce code pour commencer.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank');
  }

  terminer() {
    this.router.navigate(['/organisateur/evenements']);
  }
}

