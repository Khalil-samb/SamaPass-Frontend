export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'card';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded';

// Distinguer le paiement de billet, dun paiement de sponsorisation
export type TransactionType = 'ticket_purchase' | 'sponsored_ad';


export interface Transaction {
  id: string;
  userId: string;
  eventId: string;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  reference: string; // référence externe de l'opérateur de paiement
  createdAt: string;
  // Calculés par Django : le taux (en %) appliqué à CETTE vente, figé le jour de l'achat
  // (null pour une publicité sponsorisée), et ce que la vente rapporte à Kcrowd.
  commissionRate?: number | null;
  commissionAmount?: number;
}

// Ce qu'une transaction rapporte à Kcrowd. Le chiffre est calculé par Django, au taux figé le jour de
// l'achat : le frontend n'applique plus aucun pourcentage lui-même. Si l'API ne fournit pas encore
// ce champ, seules les publicités (100 % du montant) sont connues, jamais un taux inventé.
export function commissionDe(t: Pick<Transaction, 'type' | 'amount' | 'commissionAmount'>): number {
  if (t.commissionAmount !== undefined && t.commissionAmount !== null) return t.commissionAmount;
  return t.type === 'sponsored_ad' ? t.amount : 0;
}

// Ce qui revient à l'organisateur sur une vente de billet : le montant moins la commission de cette vente.
// Si la commission n'est pas connue (API pas encore à jour), on renvoie 0 plutôt que le montant entier :
// un déploiement incomplet doit se VOIR, pas afficher en silence un chiffre trop flatteur.
export function partOrganisateurDe(t: Pick<Transaction, 'type' | 'amount' | 'commissionAmount'>): number {
  if (t.type !== 'ticket_purchase') return 0;
  if (t.commissionAmount === undefined || t.commissionAmount === null) return 0;
  return t.amount - t.commissionAmount;
}
