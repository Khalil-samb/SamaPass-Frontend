import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataStore } from '../../../core/state/admin-data.store';
import { OrganizersService } from '../../../core/services/organizers.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category, Organizer } from '../../../core/models';
import { commissionDe as commissionDeTransaction } from '../../../core/models/transaction.model';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

type FiltreStatut = 'all' | 'active' | 'suspended';

@Component({
  imports: [FormsModule, IconComponent],
  standalone: true,
  selector: 'app-organizer-management-component',
  styleUrl: './organizer-management-component.css',
  templateUrl: './organizer-management-component.html',
})
export class OrganizersManagementComponent {
  // ⚠️ "recherche" était une simple propriété lue dans un computed : Angular
  // ne voit pas qu'elle change, donc la liste ne se filtrait jamais quand on
  // tapait. On la range dans un signal, avec un getter/setter pour que le
  // [(ngModel)]="recherche" du template continue de fonctionner tel quel.
  private rechercheSignal = signal('');
  get recherche(): string {
    return this.rechercheSignal();
  }
  set recherche(valeur: string) {
    this.rechercheSignal.set(valeur);
  }

  filtreStatut = signal<FiltreStatut>('all');

  // On retient l'IDENTIFIANT de l'organisateur sélectionné, pas une copie de
  // l'objet : sinon la fiche affichée à droite resterait périmée après une
  // suspension. L'objet est retrouvé à chaque fois dans la liste à jour.
  selectionId = signal<string | null>(null);
  organizerSelectionne = computed(
    () => this.adminStore.organizers().find((o) => o.id === this.selectionId()) ?? null
  );

  organizerCible = signal<Organizer | null>(null);
  actionEnCours = signal(false);
  erreurAction = signal<string | null>(null);

  categories = signal<Category[]>([]);

  constructor(
    public adminStore: AdminDataStore,
    private organizersService: OrganizersService,
    private categoriesService: CategoriesService
  ) {
    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));
  }

  // Django écrit "suspended" ; l'ancien front comparait à "suspendu" (d'où le
  // compteur "Suspendus" toujours à 0). On accepte les deux écritures.
  estSuspendu(x: { status: string }): boolean {
    return x.status === 'suspended' || x.status === 'suspendu';
  }

  estActif(x: { status: string }): boolean {
    return x.status === 'active';
  }

  organizersAffiches = computed(() => {
    const mot = this.recherche.trim().toLowerCase();
    const filtre = this.filtreStatut();
    return this.adminStore
      .organizers()
      .filter((o) => filtre === 'all' || (filtre === 'active' ? this.estActif(o) : this.estSuspendu(o)))
      .filter(
        (o) =>
          !mot ||
          o.organizationName.toLowerCase().includes(mot) ||
          this.telephoneDe(o).toLowerCase().includes(mot)
      );
  });

  nombreActifs = computed(() => this.adminStore.organizers().filter((o) => this.estActif(o)).length);
  nombreSuspendus = computed(() => this.adminStore.organizers().filter((o) => this.estSuspendu(o)).length);

  // Le téléphone vient maintenant directement de l'organisateur (voir le
  // correctif Django) : la liste des utilisateurs ne contient pas les
  // organisateurs, l'ancienne recherche par userId ne trouvait jamais rien.
  telephoneDe(o: Organizer): string {
    return (o as Organizer & { phone?: string }).phone ?? '';
  }

  nomCategorie(categoryId?: string): string {
    if (!categoryId) return 'Non renseignée';
    return this.categories().find((c) => c.id === categoryId)?.name ?? categoryId;
  }

  // ── Événements et chiffres, calculés sur les vraies données ──

  evenementsDe(organizerId: string) {
    return this.adminStore.events().filter((e) => e.organizer === organizerId);
  }

  evenementsRecents(organizerId: string) {
    return this.evenementsDe(organizerId)
      .slice()
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }

  private ventesReussiesDe(eventId: string) {
    return this.adminStore
      .transactions()
      .filter((t: any) => t.type === 'ticket_purchase' && t.status === 'success' && t.event === eventId);
  }

  // Le volume brut réellement encaissé pour un événement
  volumeBrutDe(eventId: string): number {
    return this.ventesReussiesDe(eventId).reduce((somme: number, t) => somme + t.amount, 0);
  }

  commissionEvenement(eventId: string): number {
    // Somme des commissions de chaque vente, chacune au taux figé le jour de son achat
    return Math.round(this.ventesReussiesDe(eventId).reduce((somme: number, t) => somme + commissionDeTransaction(t), 0));
  }

  billetsVendusDe(eventId: string): number {
    return this.adminStore.tickets().filter((t: any) => t.event === eventId).length;
  }

  volumeBrutOrganizer(organizerId: string): number {
    return this.evenementsDe(organizerId).reduce((somme, e) => somme + this.volumeBrutDe(e.id), 0);
  }

  commissionDe(organizerId: string): number {
    return this.adminStore.commissionParOrganizer(organizerId);
  }

  libelleStatutEvenement(status: string): string {
    const libelles: Record<string, string> = {
      published: 'Publié',
      draft: 'Brouillon',
      sold_out: 'Complet',
      finished: 'Terminé',
      cancelled: 'Annulé',
    };
    return libelles[status] ?? status;
  }

  classesStatutEvenement(status: string): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'sold_out':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'finished':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  formaterDate(dateISO?: string): string {
    if (!dateISO) return '—';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateISO));
  }

  // ── Suspension / réactivation : un vrai appel à Django ──

  annulerAction() {
    this.organizerCible.set(null);
    this.erreurAction.set(null);
  }

  //  Avant, l'appel au service n'était jamais "souscrit" : aucune requête
  // ne partait, le changement n'existait que dans l'écran. Django bascule
  // lui-même le statut ET écrit l'entrée du journal d'activité.
  confirmerAction() {
    const o = this.organizerCible();
    if (!o) return;

    this.actionEnCours.set(true);
    this.erreurAction.set(null);

    this.organizersService.changerStatut(o.id).subscribe({
      next: (reponse) => {
        this.adminStore.organizers.update((liste) =>
          liste.map((x) => (x.id === o.id ? { ...x, status: reponse.status as Organizer['status'] } : x))
        );
        this.organizerCible.set(null);
        this.actionEnCours.set(false);
      },
      error: (erreur) => {
        this.erreurAction.set(erreur.error?.erreur ?? "L'action a échoué. Réessayez.");
        this.actionEnCours.set(false);
      },
    });
  }

  // Un relevé réel en CSV (les recettes sont calculées, pas inventées).
  // Un PDF demanderait une librairie dédiée : on part sur du CSV, ouvrable
  // directement dans Excel.
  exporterReleve(o: Organizer) {
    const echapper = (texte: string) => `"${texte.replace(/"/g, '""')}"`;
    const lignes = ['Événement,Statut,Billets vendus,Volume brut (FCFA),Commission (FCFA)'];

    let totalBillets = 0;
    let totalVolume = 0;
    let totalCommission = 0;

    this.evenementsDe(o.id).forEach((ev) => {
      const billets = this.billetsVendusDe(ev.id);
      const volume = this.volumeBrutDe(ev.id);
      const commission = this.commissionEvenement(ev.id);
      totalBillets += billets;
      totalVolume += volume;
      totalCommission += commission;
      lignes.push([echapper(ev.title), this.libelleStatutEvenement(ev.status), billets, volume, commission].join(','));
    });
    lignes.push(['TOTAL', '', totalBillets, totalVolume, totalCommission].join(','));

    // Le \uFEFF en tête permet à Excel d'afficher correctement les accents
    const blob = new Blob(['\uFEFF' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `releve-commission-${o.organizationName.replace(/\s+/g,'-').toLowerCase()}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }
}
