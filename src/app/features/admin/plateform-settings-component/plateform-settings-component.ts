import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PlatformSettingsService, ReglagesPlateforme } from '../../../core/services/platform_setting.service';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';
import { from } from 'rxjs';

interface Message {
  type: 'succes' | 'erreur';
  texte: string;
}

// Même plafond que le serveur : le serveur reste la référence, ceci évite seulement un
// aller-retour inutile pour une faute de frappe évidente (« 50 » au lieu de « 5 »).
export const TAUX_MAX = 30;

// Montant de l'exemple affiché sous le champ (un billet courant)
export const PRIX_EXEMPLE = 10000;

// « 7,5 » et « 7.5 » sont tous deux acceptés (clavier français)
export function lireTaux(saisie: string | number): number {
  if (typeof saisie === 'number') return saisie;
  const nettoye = saisie.trim().replace(',', '.');
  return nettoye === '' ? NaN : Number(nettoye);
}

// 7.5 → « 7,5 »
export function formaterTaux(taux: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(taux);
}

@Component({
  imports: [FormsModule],
  standalone: true,
  selector: 'app-plateform-settings-component',
  styleUrl: './plateform-settings-component.css',
  templateUrl: './plateform-settings-component.html',
})
export class PlatformSettingsComponent implements OnInit {
  reglages = signal<ReglagesPlateforme | null>(null);
  chargement = signal(true);
  erreurChargement = signal<string | null>(null);

  saisie = signal('5');
  motDePasse = signal('');
  enCours = signal(false);
  message = signal<Message | null>(null);

  // La date du jour, plus celle d'une maquette (« Mardi 27 Mai 2025 » était écrite en dur)
  aujourdhui = (() => {
    const texte = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  })();

  tauxSaisi = computed(() => lireTaux(this.saisie()));

  // Message d'erreur sur la saisie, ou null si elle est correcte
  erreurSaisie = computed<string | null>(() => {
    const brut = this.saisie().trim();
    const taux = this.tauxSaisi();
    if (brut === '') return 'Saisissez un taux.';
    if (!Number.isFinite(taux)) return 'Saisissez un nombre (ex. 5 ou 7,5).';
    if (taux < 0) return 'Le taux ne peut pas être négatif.';
    if (taux > TAUX_MAX) return `Le taux ne peut pas dépasser ${TAUX_MAX} %.`;
    if (Math.abs(taux * 100 - Math.round(taux * 100)) > 1e-9) return 'Deux décimales au maximum (ex. 7,25).';
    return null;
  });

  // Le taux saisi diffère-t-il du taux enregistré ?
  modifie = computed(() => {
    const r = this.reglages();
    return !!r && this.erreurSaisie() === null && this.tauxSaisi() !== r.commissionRate;
  });

  peutEnregistrer = computed(() => this.modifie() && this.motDePasse().length > 0 && !this.enCours());

  // L'exemple se met à jour à chaque frappe : l'admin voit l'effet de son choix AVANT d'enregistrer.
  // Si la saisie est invalide, on montre l'exemple du taux actuellement en vigueur.
  exemple = computed(() => {
    const taux = this.erreurSaisie() === null ? this.tauxSaisi() : (this.reglages()?.commissionRate ?? 5);
    const commission = Math.round((PRIX_EXEMPLE * taux) / 100);
    return { prix: PRIX_EXEMPLE, taux, commission, organisateur: PRIX_EXEMPLE - commission };
  });

  derniereModification = computed(() => {
    const r = this.reglages();
    if (!r || r.history.length === 0) return null; // aucun changement depuis la mise en place : on n'invente pas de date
    const quand = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(r.updatedAt));
    return r.updatedByName ? `${quand} par ${r.updatedByName}` : quand;
  });

  constructor(private settingsService: PlatformSettingsService, private platformRate: PlatformRateStore) {}

  ngOnInit() {
    this.settingsService.getReglages().subscribe({
      next: (r) => {
        this.reglages.set(r);
        this.saisie.set(this.versSaisie(r.commissionRate));
        this.chargement.set(false);
      },
      error: () => {
        this.erreurChargement.set('Impossible de charger les paramètres. Vérifiez votre connexion et réessayez.');
        this.chargement.set(false);
      },
    });
  }

  formater(taux: number): string {
    return formaterTaux(taux);
  }

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateISO));
  }

  private versSaisie(taux: number): string {
    return String(taux).replace('.', ',');
  }

  reinitialiser() {
    const r = this.reglages();
    if (r) this.saisie.set(this.versSaisie(r.commissionRate));
    this.motDePasse.set('');
    this.message.set(null);
  }

  enregistrer() {
    if (!this.modifie()) return;
    if (!this.motDePasse()) {
      this.message.set({ type: 'erreur', texte: 'Saisissez votre mot de passe actuel pour confirmer : ce taux détermine ce que gagne la plateforme.' });
      return;
    }

    this.enCours.set(true);
    this.message.set(null);

    this.settingsService.modifierTaux(this.tauxSaisi(), this.motDePasse()).subscribe({
      next: (r) => {
        this.enCours.set(false);
        this.reglages.set(r);
        this.saisie.set(this.versSaisie(r.commissionRate));
        this.motDePasse.set(''); // jamais conservé
        this.platformRate.definir(r.commissionRate); // les estimations de cette session suivent
        this.message.set({
          type: 'succes',
          texte: `Taux de commission mis à jour : ${formaterTaux(r.commissionRate)} %. Il s'applique aux prochaines ventes ; les ventes déjà réalisées gardent leur taux.`,
        });
      },
      error: (e) => {
        this.enCours.set(false);
        this.message.set({ type: 'erreur', texte: this.messageErreur(e) });
      },
    });
  }

  // Le serveur renvoie les erreurs sous plusieurs formes ({champ: ["message"]}, {champ: "message"}) :
  // on les met toutes à plat.
  private messageErreur(e: unknown): string {
    if (!(e instanceof HttpErrorResponse)) return "Une erreur inattendue s'est produite.";
    if (e.status === 0) return 'Connexion au serveur impossible. Vérifiez votre connexion.';
    if (e.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.';
    if (e.status === 401 || e.status === 403) return 'Accès refusé. Reconnectez-vous puis réessayez.';

    const corps = e.error;
    if (corps && typeof corps === 'object') {
      const morceaux: string[] = [];
      for (const valeur of Object.values(corps)) {
        if (typeof valeur === 'string') morceaux.push(valeur);
        else if (Array.isArray(valeur)) morceaux.push(...valeur.filter((v): v is string => typeof v === 'string'));
      }
      if (morceaux.length > 0) return morceaux.join(' ');
    }
    return "L'enregistrement a échoué. Réessayez.";
  }
}
