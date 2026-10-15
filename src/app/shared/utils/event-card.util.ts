import { EventCardVM, EventCardBadge, EtatVentes } from '../ui/card-event-component/card-event-component';

// Avant, on
// recevait toute la liste des ticketTypes pour recalculer nous-mêmes le
// prix le plus bas — maintenant, Django fait déjà ce calcul et le
// renvoie directement dans "prixMin". Beaucoup plus simple, et surtout,
// ça correspond à ce qui existe VRAIMENT côté backend.
// Libellés par état des ventes. Les états « ended », « closed » et « sold_out »
// désactivent la carte ; « not_open » reste cliquable (on peut voir la fiche).
const ETATS_DESACTIVES: Record<string, { badge: string; variant: EventCardBadge['variant']; label: string }> = {
  ended: { badge: 'Terminé', variant: 'dark', label: 'Événement terminé' },
  // « closed » (ventes closes) n'est volontairement plus ici : la carte reste normale, avec seulement l'étiquette.
  // « sold_out » (complet) n'est plus ici non plus : seul un événement vraiment passé est grisé.
};

export function construireCarteEvenement(event: any): EventCardVM {
  const date = new Date(event.startDate);
  const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  const dateTimeLabel = `${jour.charAt(0).toUpperCase() + jour.slice(1)} • ${heure}`;

  //  C'est ICI qu'était le bug : avant, priceLabel valait toujours
  // 'Gratuit' car billetLeMoinsCher restait toujours null (la liste
  // ticketTypes reçue en second argument était vide ou mal filtrée).
  const priceLabel = event.prixMin != null ? `${Number(event.prixMin).toLocaleString('fr-FR')} FCFA` : 'Gratuit';

  const badges: EventCardBadge[] = [];
  const etat: EtatVentes | undefined = event.salesState;
  const desactive = etat ? ETATS_DESACTIVES[etat] : undefined;
  if (desactive) {
    badges.push({ text: desactive.badge, variant: desactive.variant });
  } else {
    if (etat === 'not_open') badges.push({ text: 'Bientôt', variant: 'official' });
    if (etat === 'closed') badges.push({ text: 'Ventes closes', variant: 'dark' });
    if (etat === 'sold_out') badges.push({ text: 'Complet', variant: 'urgent' });
    if (event.isSponsored) badges.push({ text: 'À la une', variant: 'featured' });
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.coverImageUrl,
    venue: event.venue,
    dateTimeLabel,
    ticketLabel: 'PRIX DU BILLET',
    priceLabel,
    badges,
    disabled: !!desactive,
    stateLabel: desactive?.label,
    etiquetteBouton: etat === 'closed' ? 'Ventes closes' : etat === 'sold_out' ? 'Événement complet' : undefined,
  };
}
