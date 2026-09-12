import { Component, Input } from '@angular/core';

// Un statut connu = une couleur + un texte en français.
// Si le statut reçu n'est pas dans cette liste, on affiche quand même
// quelque chose de correct (gris + le texte brut) plutôt que de planter.
const STATUTS_CONNUS: Record<string, { texte: string; classes: string }> = {
  // Événements
  draft: { texte: 'Brouillon', classes: 'bg-slate-100 text-slate-600' },
  published: { texte: 'Publié', classes: 'bg-green-100 text-green-700' },
  sold_out: { texte: 'Complet', classes: 'bg-orange-100 text-orange-700' },
  finished: { texte: 'Terminé', classes: 'bg-slate-100 text-slate-500' },
  cancelled: { texte: 'Annulé', classes: 'bg-red-100 text-red-700' },

  // Comptes (User / Organizer)
  active: { texte: 'Actif', classes: 'bg-green-100 text-green-700' },
  suspended: { texte: 'Suspendu', classes: 'bg-red-100 text-red-700' },

  // Billets
  valid: { texte: 'Valide', classes: 'bg-green-100 text-green-700' },
  used: { texte: 'Utilisé', classes: 'bg-slate-100 text-slate-500' },
};

@Component({
  imports: [],
  selector: 'app-badge-status-component',
  styleUrl: './badge-status-component.css',
  templateUrl: './badge-status-component.html',
})
export class BadgeStatusComponent {

  // le statut brut reçu
  @Input({ required: this}) status!: string;

  // Si on connait ce statut, on renvoie sa couleur + son texte
  //sinon, couleur neutre et on affiche le texte tel quel.
  get infosDuStatut(){
    return (
      STATUTS_CONNUS[this.status] ?? {
        texte: this.status,
        classes: 'bg-slate-100 text-slate-500',
      }
    );
  }
}
