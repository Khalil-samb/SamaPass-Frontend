import { Injectable, signal } from '@angular/core';

const CLE = 'kcrowd_ville';
const CLE_DEMANDE = 'kcrowd_localisation_demandee';

// Ville choisie par la personne (liste ou position), gardée sur son appareil.
// Seul l'identifiant de la ville est conservé : jamais les coordonnées.
@Injectable({ providedIn: 'root' })
export class VillePrefereeStore {
  readonly villeId = signal<string>(this.lire(CLE));
  // La personne a déjà vu l'invitation à partager sa position : on ne la lui repose pas.
  readonly dejaDemandee = signal<boolean>(this.lire(CLE_DEMANDE) === '1');

  choisir(id: string) {
    this.villeId.set(id);
    try {
      if (id) localStorage.setItem(CLE, id);
      else localStorage.removeItem(CLE);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite seulement */
    }
  }

  marquerDemandee() {
    this.dejaDemandee.set(true);
    try {
      localStorage.setItem(CLE_DEMANDE, '1');
    } catch {
      /* idem */
    }
  }

  private lire(cle: string): string {
    try {
      return localStorage.getItem(cle) ?? '';
    } catch {
      return '';
    }
  }
}
