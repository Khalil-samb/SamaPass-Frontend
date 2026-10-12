import { Component, computed, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Payout } from '../../../core/models/payout.model';
import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { PayoutsService } from '../../../core/services/payouts.service';
import { RevealDirective } from '../../../shared/directives/reveal.directive';



const LABEL_STATUT: Record<string, { texte: string; classes: string }> = {
  pending: { texte: 'En cours', classes: 'bg-amber-100 text-amber-800' },
  completed: { texte: 'Terminé', classes: 'bg-emerald-100 text-emerald-800' },
  failed: { texte: 'Échoué', classes: 'bg-red-100 text-red-800' },
};

const LABEL_METHODE: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
};

@Component({
  imports: [RevealDirective],
  standalone:true,
  selector: 'app-payouts-component',
  styleUrl: './payouts-component.css',
  templateUrl: './payouts-component.html',
})
export class PayoutsComponent implements OnInit {
  LABEL_STATUT = LABEL_STATUT;
  LABEL_METHODE = LABEL_METHODE;

  payouts = signal<Payout[]>([]);
  chargement = signal(true);
  erreurChargement = signal<string | null>(null);
  demandeEnCours = signal(false);
  // Un virement envoie de l'argent : on demande toujours confirmation, avec le montant et le compte
  confirmationOuverte = signal(false);
  message = signal<{ type: 'succes' | 'erreur'; texte: string } | null>(null);

  constructor(
    public eventStore: SelectedEventStore,
    private payoutsService: PayoutsService
  ) {}

  ngOnInit() {
    this.rafraichirListe();
    // Le solde affiché est celui du serveur, à jour dès l'ouverture de la page
    void this.eventStore.rafraichir();
  }

  // ⚠️ Django ne renvoie QUE les virements de l'organisateur connecté : plus de filtre côté Angular.
  // Avant, la page filtrait sur « organizerId », un champ que Django n'envoie pas (il envoie « organizer ») :
  // l'historique restait donc toujours vide.
  private rafraichirListe() {
    this.payoutsService.getAll().subscribe({
      next: (liste) => {
        this.payouts.set([...(liste ?? [])].sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? '')));
        this.erreurChargement.set(null);
        this.chargement.set(false);
      },
      error: () => {
        this.erreurChargement.set("Impossible de charger l'historique de vos reversements. Vérifiez votre connexion.");
        this.chargement.set(false);
      },
    });
  }

  // Un statut inconnu s'affiche tel quel au lieu de faire planter la page
  statut(payout: Payout): { texte: string; classes: string } {
    return LABEL_STATUT[payout.status] ?? { texte: payout.status, classes: 'bg-slate-100 text-slate-600' };
  }

  payoutsTermines = computed(() => this.payouts().filter((p) => p.status === 'completed'));

  totalDejaReverse = computed(() => this.payoutsTermines().reduce((s, p) => s + p.amount, 0));

  dernierVirementLabel = computed(() => {
    const dernier = this.payoutsTermines()[0];
    return dernier ? this.formaterDate(dernier.processedAt ?? dernier.requestedAt) : '—';
  });

  labelMoyenPaiement(): string {
    const methode = this.eventStore.organizer()?.paymentMethod;
    return methode ? LABEL_METHODE[methode] : '';
  }

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateISO));
  }

  ouvrirConfirmation() {
    if (this.eventStore.soldeAReverser() <= 0 || this.demandeEnCours()) return;
    this.message.set(null);
    this.confirmationOuverte.set(true);
  }

  annulerConfirmation() {
    this.confirmationOuverte.set(false);
  }

  // ⚠️ Avant : la page fabriquait un faux virement en mémoire et appelait des méthodes qui visent des routes
  // inexistantes, sans même s'y abonner — AUCUNE requête ne partait. Maintenant c'est la vraie route de
  // Django, qui recalcule elle-même le montant (jamais une valeur envoyée par le navigateur).
  confirmerVirement() {
    if (this.demandeEnCours()) return; // un double clic ne doit pas demander deux virements
    this.demandeEnCours.set(true);
    this.message.set(null);

    this.payoutsService.demanderVirement().subscribe({
      next: (payout) => {
        this.terminerDemande();
        const compte = this.eventStore.organizer()?.mobileMoneyAccountNumber ?? '';
        this.message.set({
          type: 'succes',
          texte: `Virement de ${payout.amount.toLocaleString('fr-FR')} FCFA envoyé vers ${this.labelMoyenPaiement()} ${compte}. Référence : ${payout.reference}.`,
        });
      },
      error: (e) => {
        this.terminerDemande();
        this.message.set({ type: 'erreur', texte: this.messageErreur(e) });
      },
    });
  }

  // Dans tous les cas, on recharge l'historique ET le solde : ils reflètent la vérité du serveur
  private terminerDemande() {
    this.confirmationOuverte.set(false);
    this.demandeEnCours.set(false);
    this.rafraichirListe();
    void this.eventStore.rafraichir();
  }

  private messageErreur(e: unknown): string {
    if (!(e instanceof HttpErrorResponse)) return "Une erreur inattendue s'est produite.";
    if (e.status === 0) return 'Connexion au serveur impossible. Vérifiez votre connexion puis réessayez.';
    if (e.status === 402) return "Le virement a échoué : l'opérateur de paiement l'a refusé. Votre solde n'a pas été débité, vous pouvez réessayer.";
    if (typeof e.error?.erreur === 'string') return e.error.erreur;
    return 'La demande de virement a échoué. Réessayez.';
  }
}

