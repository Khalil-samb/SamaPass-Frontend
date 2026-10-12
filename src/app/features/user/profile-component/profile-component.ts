import { Component, signal } from '@angular/core';
import { AuthStore } from '../../../core/state/auth.store';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

@Component({
  imports: [RouterLink, FormsModule, IconComponent],
  standalone:true,
  selector: 'app-profile-component',
  styleUrl: './profile-component.css',
  templateUrl: './profile-component.html',
})
export class ProfileComponent {
  prenom = signal('');
  nom = signal('');
  messageConfirmation = signal(false);

  get prenomModel() { return this.prenom(); } set prenomModel(v: string) { this.prenom.set(v); }
  get nomModel() { return this.nom(); } set nomModel(v: string) { this.nom.set(v); }

  constructor(
    public authStore: AuthStore,
    private router: Router
  ) {
    const u = this.authStore.currentUser();
    this.prenom.set(u?.firstName ?? '');
    this.nom.set(u?.lastName ?? '');
  }

  initiales(): string {
    return (this.authStore.currentUser()?.firstName[0] ?? '?').toUpperCase();
  }

  enregistrer() {
    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) return;
    this.authStore.mettreAJourUtilisateur({ ...utilisateur, firstName: this.prenom(), lastName: this.nom() });
    this.messageConfirmation.set(true);
    setTimeout(() => this.messageConfirmation.set(false), 2500);
  }

  bientotDisponible() {
    alert('Le changement de numéro (avec nouvelle vérification par code) sera bientôt disponible.');
  }

  seDeconnecter() {
    this.authStore.logout();
    this.router.navigateByUrl('/bienvenue');
  }
}
