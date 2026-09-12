import { EventEntiy } from '../../core/models/event.model';
import { TicketType } from '../../core/models/ticket-type.model';
import { EventCardVM, EventCardBadge } from '../ui/card-event-component/card-event-component';

// Même logique que dans HomeComponent, extraite ici pour être réutilisée
// (par exemple sur la page de confirmation, pour les "événements recommandés").
export function construireCarteEvenement(event: EventEntiy, ticketTypes: TicketType[]): EventCardVM {
  const billetsDeCetEvenement = ticketTypes.filter((t) => t.eventId === event.id);

  const billetLeMoinsCher = billetsDeCetEvenement.length
    ? billetsDeCetEvenement.reduce((moinsCher, t) => (t.price < moinsCher.price ? t : moinsCher))
    : null;

  const date = new Date(event.startDate);
  const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  const dateTimeLabel = `${jour.charAt(0).toUpperCase() + jour.slice(1)} • ${heure}`;

  const nomBillet = (billetLeMoinsCher?.name ?? '').toLowerCase();
  const ticketLabel = nomBillet.includes('vip') ? 'BILLET VIP' : nomBillet.includes('pass') ? 'PASS FESTIVAL' : 'PRIX DU BILLET';
  const priceLabel = billetLeMoinsCher ? `${billetLeMoinsCher.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit';

  const tauxRemplissage = billetsDeCetEvenement.length
    ? billetsDeCetEvenement.reduce((s, t) => s + t.quantitySold, 0) /
      billetsDeCetEvenement.reduce((s, t) => s + t.quantityTotal, 0)
    : 0;

  const badges: EventCardBadge[] = [];
  if (event.isSponsored) badges.push({ text: 'À la une', variant: 'featured' });
  if (tauxRemplissage >= 0.85) badges.push({ text: 'Dernières places', variant: 'urgent' });

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.coverImageUrl,
    venue: event.venue,
    dateTimeLabel,
    ticketLabel,
    priceLabel,
    badges,
  };
}
