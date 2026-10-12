import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthStore } from '../../../core/state/auth.store';
import { User } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { environment } from '../../../../environments';


// ⚠️ Même remarque que pour l'intercepteur : à terme, préférez un proxy
// Angular plutôt qu'une URL en dur ici.


interface ReponseConnexion {
  access: string;
  refresh: string;
  user: User;
}


@Component({
  imports: [RouterLink, FormsModule, IconComponent],
  selector: 'app-organizer-login-component',
  styleUrl: './organizer-login-component.css',
  templateUrl: './organizer-login-component.html',
})
export class OrganizerLoginComponent {
  email = signal('');
  motDePasse = signal('');
  erreur = signal<string | null>(null);
  connexionEnCours = signal(false);

  get emailModel() { return this.email(); } set emailModel(v: string) { this.email.set(v); }
  get motDePasseModel() { return this.motDePasse(); } set motDePasseModel(v: string) { this.motDePasse.set(v); }

  constructor(
    private http: HttpClient,
    private authStore: AuthStore,
    private router: Router
  ) {}

  seConnecter() {
    if (!this.email().trim() || !this.motDePasse().trim()) {
      this.erreur.set('Merci de renseigner votre email et votre mot de passe.');
      return;
    }

    this.connexionEnCours.set(true);
    this.erreur.set(null);

    // ⚠️ Avant : on cherchait l'utilisateur dans un faux tableau en
    // mémoire. Maintenant : un vrai appel HTTP vers Django, qui vérifie
    // le mot de passe haché et renvoie de vrais jetons JWT.
    this.http
      .post<ReponseConnexion>(`${environment.apiUrl}/api/auth/organizer/login/`, {
        email: this.email(),
        password: this.motDePasse(),
      })
      .subscribe({
        next: (reponse) => {
          this.connexionEnCours.set(false);
          this.authStore.setIdentifiedUser(reponse.user, reponse.access, reponse.refresh);
          this.router.navigateByUrl('/organisateur');
        },
        error: (erreur) => {
          this.connexionEnCours.set(false);
          // erreur.error contient le corps JSON renvoyé par Django,
          // ex. { erreur: "Email ou mot de passe incorrect." }
          this.erreur.set(erreur.error?.erreur ?? 'Une erreur est survenue. Réessayez.');
        },
      });
  }
}

