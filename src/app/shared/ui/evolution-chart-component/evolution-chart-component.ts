import { Component, Input, computed, signal } from '@angular/core';

export type Granularite = 'jour' | 'semaine' | 'mois';

// Un événement brut : "à cette date, il s'est passé cette valeur"
// (ex. une transaction de 10 000 FCFA, ou un billet vendu = valeur 1).
export interface PointBrut {
  date: string; // ISO, ex. "2026-09-27T14:38:48Z"
  valeur: number;
}

export interface SerieGraphique {
  nom: string;
  couleur: string;
  unite: string;
  points: PointBrut[];
}

interface PointTrace {
  x: number;
  y: number;
  valeur: number;
}

interface LigneTracee {
  nom: string;
  couleur: string;
  unite: string;
  points: PointTrace[];
  polyline: string;
  aire: string;
}

// Le dessin utilise un repère 0-100 (des pourcentages) : la courbe s'étire
// donc toute seule à la largeur du conteneur, sans déformer les traits.
const Y_HAUT = 8;
const Y_BAS = 92;
const X_GAUCHE = 3;
const X_LARGEUR = 94;

const MAX_PERIODES = 400;
const MAX_POINTS_VISIBLES = 40;
const NB_ETIQUETTES = 6;

@Component({
  imports: [],
  standalone:true,
  selector: 'app-evolution-chart-component',
  styleUrl: './evolution-chart-component.css',
  templateUrl: './evolution-chart-component.html',
})

export class EvolutionChartComponent {
  private seriesSignal = signal<SerieGraphique[]>([]);
  private cumuleSignal = signal(true);

  @Input({ required: true }) set series(valeur: SerieGraphique[]) {
    this.seriesSignal.set(valeur ?? []);
  }

  // true = courbe cumulée (progression totale), false = valeur de chaque période
  @Input() set cumule(valeur: boolean) {
    this.cumuleSignal.set(valeur);
  }

  modes: { valeur: Granularite; label: string }[] = [
    { valeur: 'jour', label: 'Par jour' },
    { valeur: 'semaine', label: 'Par semaine' },
    { valeur: 'mois', label: 'Par mois' },
  ];

  mode = signal<Granularite>('jour');
  survol = signal<number | null>(null);
  lignesGrille = [20, 40, 60, 80];

  legende = computed(() => this.seriesSignal().map((s) => ({ nom: s.nom, couleur: s.couleur })));

  aDesDonnees = computed(() => this.seriesSignal().some((s) => s.points.length > 0));

  // La liste continue des périodes, de la première à la dernière, en
  // comblant les trous (un jour sans vente = une période à zéro).
  periodes = computed<string[]>(() => {
    const mode = this.mode();
    const cles = this.seriesSignal()
      .flatMap((s) => s.points)
      .filter((p) => !!p.date)
      .map((p) => this.cle(p.date, mode))
      .sort();
    if (cles.length === 0) return [];

    const liste: string[] = [];
    const fin = cles[cles.length - 1];
    let courant = cles[0];
    while (courant <= fin && liste.length < MAX_PERIODES) {
      liste.push(courant);
      courant = this.decale(courant, mode, 1);
    }

    // Une seule période : on ajoute la précédente (à zéro) pour pouvoir
    // tracer une vraie courbe qui monte, au lieu d'un point isolé.
    if (liste.length === 1) liste.unshift(this.decale(liste[0], mode, -1));
    return liste;
  });

  lignes = computed<LigneTracee[]>(() => {
    const mode = this.mode();
    const periodes = this.periodes();
    const n = periodes.length;
    if (n === 0) return [];
    const cumule = this.cumuleSignal();

    return this.seriesSignal().map((serie) => {
      const parPeriode = new Map<string, number>();
      serie.points
        .filter((p) => !!p.date)
        .forEach((p) => {
          const k = this.cle(p.date, mode);
          parPeriode.set(k, (parPeriode.get(k) ?? 0) + p.valeur);
        });

      let cumul = 0;
      const valeurs = periodes.map((k) => {
        const v = parPeriode.get(k) ?? 0;
        if (!cumule) return v;
        cumul += v;
        return cumul;
      });

      // Chaque série est mise à l'échelle sur SON propre maximum : c'est ce
      // qui permet d'afficher ensemble des FCFA et un nombre de billets.
      const max = Math.max(...valeurs, 1);
      const points: PointTrace[] = valeurs.map((valeur, i) => ({
        x: X_GAUCHE + (X_LARGEUR * i) / (n - 1),
        y: Y_BAS - (valeur / max) * (Y_BAS - Y_HAUT),
        valeur,
      }));

      const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
      const aire = `${polyline} ${points[n - 1].x},${Y_BAS} ${points[0].x},${Y_BAS}`;

      return { nom: serie.nom, couleur: serie.couleur, unite: serie.unite, points, polyline, aire };
    });
  });

  afficherPoints = computed(() => this.periodes().length <= MAX_POINTS_VISIBLES);

  // Des zones invisibles, une par période, pour détecter le survol de la souris
  colonnes = computed(() => {
    const n = this.periodes().length;
    if (n < 2) return [];
    const pas = X_LARGEUR / (n - 1);
    return this.periodes().map((_, i) => {
      const centre = X_GAUCHE + pas * i;
      const gauche = Math.max(0, centre - pas / 2);
      const droite = Math.min(100, centre + pas / 2);
      return { gauche, largeur: droite - gauche };
    });
  });

  etiquettes = computed(() => {
    const periodes = this.periodes();
    const n = periodes.length;
    if (n < 2) return [];
    const mode = this.mode();
    const nb = Math.min(n, NB_ETIQUETTES);
    const indices = new Set<number>();
    for (let k = 0; k < nb; k++) indices.add(Math.round((k * (n - 1)) / (nb - 1)));
    return Array.from(indices).map((i) => ({
      x: X_GAUCHE + (X_LARGEUR * i) / (n - 1),
      texte: this.formaterCourt(periodes[i], mode),
    }));
  });

  infoSurvol = computed(() => {
    const i = this.survol();
    if (i === null) return null;
    const lignes = this.lignes();
    const periodes = this.periodes();
    const reference = lignes[0]?.points[i];
    if (!reference || !periodes[i]) return null;

    return {
      x: reference.x,
      xBulle: Math.min(80, Math.max(20, reference.x)),
      titre: this.formaterLong(periodes[i], this.mode()),
      valeurs: lignes.map((l) => ({
        nom: l.nom,
        couleur: l.couleur,
        texte: `${Math.round(l.points[i].valeur).toLocaleString('fr-FR')} ${l.unite}`,
      })),
    };
  });

  // ── Calculs de dates (tout en UTC, pour ne jamais dépendre du fuseau) ──

  // La "clé" de la période à laquelle appartient une date :
  // jour → "2026-09-27", semaine → le lundi de cette semaine, mois → "2026-09"
  private cle(dateISO: string, mode: Granularite): string {
    const jour = dateISO.slice(0, 10);
    if (mode === 'jour') return jour;
    if (mode === 'mois') return jour.slice(0, 7);

    const d = new Date(`${jour}T00:00:00Z`);
    const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0
    d.setUTCDate(d.getUTCDate() - decalage);
    return d.toISOString().slice(0, 10);
  }

  // La période suivante (sens = 1) ou précédente (sens = -1)
  private decale(cle: string, mode: Granularite, sens: 1 | -1): string {
    if (mode === 'mois') {
      const [annee, mois] = cle.split('-').map(Number);
      return new Date(Date.UTC(annee, mois - 1 + sens, 1)).toISOString().slice(0, 7);
    }
    const d = new Date(`${cle}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + sens * (mode === 'semaine' ? 7 : 1));
    return d.toISOString().slice(0, 10);
  }

  private dateDepuisCle(cle: string): Date {
    return new Date(`${cle.length === 7 ? `${cle}-01` : cle}T00:00:00Z`);
  }

  private formaterCourt(cle: string, mode: Granularite): string {
    const d = this.dateDepuisCle(cle);
    if (mode === 'mois') {
      return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(d);
    }
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  }

  private formaterLong(cle: string, mode: Granularite): string {
    const d = this.dateDepuisCle(cle);
    if (mode === 'mois') {
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    }
    const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    return mode === 'semaine' ? `Semaine du ${jour}` : jour;
  }
}

