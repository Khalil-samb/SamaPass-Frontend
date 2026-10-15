import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon-component/icon-component';
// Les différents types de badge qu'on peut poser sur une carte, avec leur couleur.
export type EventCardBadgeVariant = 'featured' | 'official' | 'dark' | 'urgent' | 'vip';

// État des ventes calculé par le serveur (champ « salesState » de l'API).
export type EtatVentes = 'open' | 'not_open' | 'closed' | 'sold_out' | 'ended' | 'unavailable';

export interface EventCardBadge {
  text: string;
  variant: EventCardBadgeVariant;
}

// L'objet "prêt à afficher" que la page (HomeComponent, SearchResultsComponent...)
// doit construire à partir des données brutes avant de le donner à cette carte.
export interface EventCardVM {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  venue: string;             // ex: "Monument de la Renaissance"
  dateTimeLabel: string;     // ex: "Samedi 24 mai 2026 • 20:00"
  ticketLabel: string;       // ex: "PRIX DU BILLET", "PASS FESTIVAL", "BILLET VIP"
  priceLabel: string;        // ex: "10 000 FCFA"
  badges: EventCardBadge[];
  // Si true, la carte est grisée et non cliquable (événement terminé, complet ou ventes closes).
  disabled?: boolean;
  // Texte affiché à la place du bouton « Acheter » quand la carte est désactivée.
  stateLabel?: string;
  // Événement pas encore passé mais non achetable (ventes closes, complet) : la carte reste normale,
  // seul le bouton « Acheter » est remplacé par ce texte.
  etiquetteBouton?: string;
}

const CLASSES_PAR_BADGE: Record<EventCardBadgeVariant, string> = {
  featured: 'bg-blue-600 text-white',
  official: 'bg-white/95 text-slate-700',
  dark: 'bg-slate-900 text-white',
  urgent: 'bg-red-600 text-white',
  vip: 'bg-orange-700 text-white',
};



@Component({
  imports: [RouterLink, IconComponent],
  standalone: true,
  selector: 'app-card-event-component',
  styleUrl: './card-event-component.css',
  templateUrl: './card-event-component.html',
})
export class CardEventComponent {
  @Input({ required: true }) event!: EventCardVM;

  // Rendu accessible directement depuis le template
  CLASSES_PAR_BADGE = CLASSES_PAR_BADGE;
}
