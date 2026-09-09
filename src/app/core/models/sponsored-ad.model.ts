export type SponsoredAdStatus ='active' | 'expired'

// Publicité vidéo sponsorisée : l'organisateur choisit une formule, paie directement
// (comme un achat de billet), et l'annonce devient active dès le paiement confirmé.
// Aucune validation par l'administrateur.
export interface SponsoredAd {
  id: string;
  organizerId: string;
  eventId: string;
  transactionId: string;     // paiement qui a permis d'activer cette publicité
  videoUrl: string;
  packageName: string;       // ex: "Pack Découverte", "Pack Premium"
  price: number;             
  status: SponsoredAdStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
}
