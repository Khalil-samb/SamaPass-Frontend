import { Injectable, signal, computed } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { OrganizersService } from '../services/organizers.service';
import { EventsService } from '../services/events.service';
import { PayoutsService } from '../services/payouts.service';

import { EventEntity } from '../models/event.model';
import { Organizer } from '../models/organizer.model';

// Toutes les 20 secondes, tant qu'une page de l'espace organisateur qui affiche
// des chiffres est ouverte ET visible. Mettre 0 pour désactiver ce minuteur
// (les rafraîchissements « au retour sur l'onglet » et « à l'ouverture d'une
// page » continuent de fonctionner).
const INTERVALLE_RAFRAICHISSEMENT_MS = 20_000;

// Deux événements de retour au premier plan très rapprochés (changement d'onglet
// ET focus de la fenêtre arrivent souvent ensemble) ne déclenchent qu'un seul
// rechargement.
const DELAI_MIN_ENTRE_RETOURS_MS = 2_000;

// Clé de mémorisation de l'événement choisi (survit au rechargement de la page).
const CLE_EVENEMENT_SELECTIONNE = 'kcrowd_evenement_selectionne';

function lireEvenementMemorise(): string | null {
  try { return localStorage.getItem(CLE_EVENEMENT_SELECTIONNE); } catch { return null; }
}
function memoriserEvenement(id: string) {
  try { localStorage.setItem(CLE_EVENEMENT_SELECTIONNE, id); } catch { /* navigation privée... */ }
}

@Injectable({ providedIn: 'root' })
export class SelectedEventStore {
  events = signal<EventEntity[]>([]);
  selectedEventId = signal<string | null>(null);
  organizer = signal<Organizer | null>(null);
  loading = signal(true);
  soldeAReverser = signal(0);

  // Augmente chaque fois que les données ont VRAIMENT changé (jamais pour un
  // rechargement qui ramène exactement les mêmes chiffres). Les pages qui
  // chargent leurs propres données (billets, transactions...) lisent ce compteur
  // dans un effect() : elles se rechargent toutes seules, et seulement si utile.
  versionDonnees = signal(0);

  selectedEvent = computed(() => this.events().find((e) => e.id === this.selectedEventId()) ?? null);

  //  Les catégories de billets sont maintenant DIRECTEMENT imbriquées
  // dans chaque événement (grâce à EventDetailSerializer côté Django) —
  // plus besoin d'un signal séparé ni d'un appel réseau en plus.
  ticketTypesEvenementSelectionne = computed(() => this.selectedEvent()?.ticketTypes ?? []);

  private signatureActuelle = '';
  private rafraichissementEnCours: Promise<void> | null = null;
  private rafraichissementRedemande = false;
  private dernierRetourAuPremierPlan = 0;
  private nbEcransActifs = 0;
  private minuteur: ReturnType<typeof setInterval> | null = null;

  constructor(
    private organizersService: OrganizersService,
    private eventsService: EventsService,
    private payoutsService: PayoutsService
  ) {}

  // Chargement COMPLET (profil + événements + solde), avec l'indicateur
  // « Chargement... ». Appelé à l'ouverture de l'espace organisateur.
  charger() {
    this.loading.set(true);

    this.organizersService.getMonProfil().subscribe({
      next: (organizer) => {
        this.organizer.set(organizer);

        forkJoin({
          events: this.eventsService.getMesEvenements(),
          solde: this.payoutsService.getSolde(),
        }).subscribe({
          next: ({ events, solde }) => {
            this.appliquer(events, solde.soldeDisponible);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  // Rechargement SILENCIEUX : pas d'indicateur « Chargement... », l'écran ne
  // clignote pas. En cas d'erreur réseau, on garde les chiffres actuels.
  //
  // Si un rechargement est déjà en route quand on en redemande un (ex. : juste
  // après l'enregistrement d'une modification), le premier a peut-être été lancé
  // AVANT la modification et ramènerait de vieux chiffres : on en enchaîne donc
  // un second, et la promesse rendue ne se termine qu'après lui.
  rafraichir(): Promise<void> {
    if (this.rafraichissementEnCours) {
      this.rafraichissementRedemande = true;
      return this.rafraichissementEnCours;
    }

    this.rafraichissementEnCours = (async () => {
      try {
        do {
          this.rafraichissementRedemande = false;
          try {
            const { events, solde } = await firstValueFrom(
              forkJoin({
                events: this.eventsService.getMesEvenements(),
                solde: this.payoutsService.getSolde(),
              })
            );
            this.appliquer(events, solde.soldeDisponible);
          } catch {
            // réseau coupé, serveur indisponible... : on garde ce qu'on a
          }
        } while (this.rafraichissementRedemande);
      } finally {
        this.rafraichissementEnCours = null;
      }
    })();

    return this.rafraichissementEnCours;
  }

  // Une page qui affiche des chiffres déclare qu'elle est ouverte (utiliser) puis
  // qu'elle se ferme (liberer). Tant qu'au moins une est ouverte, les chiffres se
  // rafraîchissent d'eux-mêmes ; quand il n'y en a plus, tout s'arrête.
  utiliser() {
    this.nbEcransActifs++;
    if (this.nbEcransActifs > 1 || typeof document === 'undefined') return;

    if (INTERVALLE_RAFRAICHISSEMENT_MS > 0) {
      this.minuteur = setInterval(() => {
        if (document.visibilityState === 'visible') void this.rafraichir();
      }, INTERVALLE_RAFRAICHISSEMENT_MS);
    }
    document.addEventListener('visibilitychange', this.auRetourAuPremierPlan);
    window.addEventListener('focus', this.auRetourAuPremierPlan);
  }

  liberer() {
    this.nbEcransActifs = Math.max(0, this.nbEcransActifs - 1);
    if (this.nbEcransActifs > 0) return;

    if (this.minuteur) {
      clearInterval(this.minuteur);
      this.minuteur = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.auRetourAuPremierPlan);
      window.removeEventListener('focus', this.auRetourAuPremierPlan);
    }
  }

  selectionner(eventId: string) {
    this.selectedEventId.set(eventId);
    memoriserEvenement(eventId);
  }

  // Quelqu'un revient sur l'onglet (ex. après avoir acheté un billet de test dans
  // un autre onglet) : les chiffres sont mis à jour sans qu'il ait rien à faire.
  private auRetourAuPremierPlan = () => {
    if (document.visibilityState !== 'visible') return;
    const maintenant = Date.now();
    if (maintenant - this.dernierRetourAuPremierPlan < DELAI_MIN_ENTRE_RETOURS_MS) return;
    this.dernierRetourAuPremierPlan = maintenant;
    void this.rafraichir();
  };

  // Met à jour les signaux, mais SEULEMENT si les données ont changé : un
  // rechargement qui ramène exactement les mêmes chiffres ne relance rien.
  private appliquer(events: EventEntity[], solde: number) {
    const signature = JSON.stringify(events) + '#' + solde;
    if (signature !== this.signatureActuelle) {
      this.signatureActuelle = signature;
      this.events.set(events);
      this.soldeAReverser.set(solde);
      this.versionDonnees.update((v) => v + 1);
    }

    // Événement sélectionné : à la première arrivée, ou s'il n'existe plus
    const actuel = this.selectedEventId();
    if ((!actuel || !events.some((e) => e.id === actuel)) && events.length > 0) {
      const memorise = lireEvenementMemorise();
      const enCours =
        events.find((e) => e.id === memorise) ??
        events.find((e) => e.status === 'published') ??
        events[0];
      this.selectedEventId.set(enCours.id);
    }
  }
}
