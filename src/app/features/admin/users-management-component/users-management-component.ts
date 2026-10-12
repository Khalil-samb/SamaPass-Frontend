import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../core/models';
import { AdminDataStore } from '../../../core/state/admin-data.store';
import { UsersService } from '../../../core/services/users.service';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

type FiltreStatut = 'all' | 'active' | 'suspended';

@Component({
  imports: [FormsModule, IconComponent],
  standalone: true,
  selector: 'app-users-management-component',
  styleUrl: './users-management-component.css',
  templateUrl: './users-management-component.html',
})
export class UsersManagementComponent {
  // ⚠️ Même correctif que pour les organisateurs : une propriété ordinaire lue
  // dans un computed ne déclenche jamais de recalcul, la recherche ne
  // filtrait donc rien. Signal + getter/setter : le [(ngModel)]="recherche"
  // du template reste inchangé.
  private rechercheSignal = signal('');
  get recherche(): string {
    return this.rechercheSignal();
  }
  set recherche(valeur: string) {
    this.rechercheSignal.set(valeur);
  }

  filtreStatut = signal<FiltreStatut>('all');
  utilisateurCible = signal<User | null>(null);
  actionEnCours = signal(false);
  erreurAction = signal<string | null>(null);

  constructor(
    public adminStore: AdminDataStore,
    private usersService: UsersService
  ) {}

  // Django écrit "suspended" ; l'ancien front comparait à "suspendu".
  estSuspendu(x: { status: string }): boolean {
    return x.status === 'suspended' || x.status === 'suspendu';
  }

  estActif(x: { status: string }): boolean {
    return x.status === 'active';
  }

  nomComplet(u: User): string {
    return `${u.firstName} ${u.lastName ?? ''}`.trim();
  }

  tousLesUtilisateurs = computed(() => this.adminStore.users().filter((u) => u.role === 'user'));
  nombreActifs = computed(() => this.tousLesUtilisateurs().filter((u) => this.estActif(u)).length);
  nombreSuspendus = computed(() => this.tousLesUtilisateurs().filter((u) => this.estSuspendu(u)).length);

  utilisateursAffiches = computed(() => {
    const mot = this.recherche.trim().toLowerCase();
    const filtre = this.filtreStatut();
    return this.tousLesUtilisateurs()
      .filter((u) => filtre === 'all' || (filtre === 'active' ? this.estActif(u) : this.estSuspendu(u)))
      .filter(
        (u) =>
          !mot ||
          this.nomComplet(u).toLowerCase().includes(mot) ||
          (u.phone ?? '').includes(mot) ||
          (u.email ?? '').toLowerCase().includes(mot)
      );
  });

  // Une date absente ne doit jamais faire planter l'affichage de toute la liste
  formaterDate(dateISO?: string): string {
    if (!dateISO) return '—';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateISO));
  }

  annulerAction() {
    this.utilisateurCible.set(null);
    this.erreurAction.set(null);
  }

  // ⚠️ Avant : l'appel au service n'était jamais "souscrit" (aucune requête
  // envoyée) et la méthode utilisée n'existe plus. Django bascule maintenant
  // lui-même le statut et écrit l'entrée du journal d'activité.
  confirmerAction() {
    const u = this.utilisateurCible();
    if (!u) return;

    this.actionEnCours.set(true);
    this.erreurAction.set(null);

    this.usersService.changerStatut(u.id).subscribe({
      next: (misAJour) => {
        this.adminStore.users.update((liste) =>
          liste.map((x) => (x.id === u.id ? { ...x, status: misAJour.status } : x))
        );
        this.utilisateurCible.set(null);
        this.actionEnCours.set(false);
      },
      error: (erreur) => {
        this.erreurAction.set(erreur.error?.erreur ?? "L'action a échoué. Réessayez.");
        this.actionEnCours.set(false);
      },
    });
  }
}
