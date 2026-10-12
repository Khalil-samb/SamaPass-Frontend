
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthStore } from '../../../core/state/auth.store';
import { User } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { environment } from '../../../../environments';



interface ReponseConnexion {
  access: string;
  refresh: string;
  user: User;
}


@Component({
  imports: [FormsModule, IconComponent],
  selector: 'app-admin-login-component',
  styleUrl: './admin-login-component.css',
  templateUrl: './admin-login-component.html',
})

export class AdminLoginComponent {
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

    this.http
      .post<ReponseConnexion>(`${environment.apiUrl}/api/auth/admin/login/`, {
        email: this.email(),
        password: this.motDePasse(),
      })
      .subscribe({
        next: (reponse) => {
          this.connexionEnCours.set(false);
          this.authStore.setIdentifiedUser(reponse.user, reponse.access, reponse.refresh);
          this.router.navigateByUrl('/admin');
        },
        error: (erreur) => {
          this.connexionEnCours.set(false);
          this.erreur.set(erreur.error?.erreur ?? 'Une erreur est survenue. Réessayez.');
        },
      });
  }
}

