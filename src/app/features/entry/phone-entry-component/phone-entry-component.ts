import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { OtpBottomSheetComponent } from '../otp-bottom-sheet-component/otp-bottom-sheet-component';
import { AuthStore } from '../../../core/state/auth.store';
import { User } from '../../../core/models';
import { environment } from '../../../../environments'; // ⚠️ ajustez le nombre de "../" selon l'emplacement réel de ce fichier

interface ReponseVerificationOtp {
  access: string;
  refresh: string;
  user: User;
}

@Component({
  selector: 'app-phone-entry',
  standalone: true,
  imports: [FormsModule, OtpBottomSheetComponent],
  templateUrl: './phone-entry-component.html',
})
export class PhoneEntryComponent {
  firstName = '';
  phone = '';

  showOtpSheet = signal(false);
  errorMessage = signal<string | null>(null);
  envoiEnCours = signal(false);

  constructor(
    private router: Router,
    private authStore: AuthStore,
    private http: HttpClient
  ) {}

  get isFormValid(): boolean {
    return this.firstName.trim().length >= 2 && this.phone.trim().length >= 9;
  }

  onSubmit() {
    if (!this.isFormValid) {
      this.errorMessage.set('Merci de renseigner votre nom et un numéro valide.');
      return;
    }

    const phone = this.phone.trim();
    this.phone = phone;
    this.errorMessage.set(null);
    this.envoiEnCours.set(true);

    // ⚠️ Avant : on ouvrait directement le tiroir OTP sans rien demander
    // à personne. Maintenant : on demande VRAIMENT à Django de générer
    // et d'envoyer un code (affiché dans son terminal pour l'instant).
    this.http.post(`${environment.apiUrl}/api/auth/otp/request/`, { phone }).subscribe({
      next: () => {
        this.envoiEnCours.set(false);
        this.showOtpSheet.set(true);
      },
      error: (erreur) => {
        console.error('[OTP VERIFY ERROR]', erreur);
        console.error('[OTP VERIFY ERROR BODY]', erreur.error);

        this.errorMessage.set(
          erreur.error?.erreur ??
          erreur.error?.detail ??
          JSON.stringify(erreur.error) ??
          'Code invalide ou expiré.'
        );
      },
    });
  }

  // ⚠️ IMPORTANT : cette méthode doit maintenant recevoir le CODE tapé
  // par la personne (pas juste être appelée "à vide" comme avant). Ça
  // suppose qu'OtpBottomSheetComponent émette le code saisi au lieu de
  // le vérifier lui-même en interne — voir la remarque plus bas.
  onOtpVerified(code: string) {
    this.errorMessage.set(null);

    const phone = this.phone.trim();
    const normalizedCode = String(code).trim();
    const firstName = this.firstName.trim();

    const payload = {
      phone,
      code: normalizedCode,
      first_name: firstName,
      last_name: '',
    };

    console.log('[OTP VERIFY PAYLOAD]', payload);

    this.http
      .post<ReponseVerificationOtp>(
        `${environment.apiUrl}/api/auth/otp/verify/`,
        payload
      )
      .subscribe({
        next: (reponse) => {
          this.authStore.setIdentifiedUser(
            reponse.user,
            reponse.access,
            reponse.refresh
          );

          this.router.navigateByUrl('/');
        },
        error: (erreur) => {
          console.error('[OTP VERIFY ERROR]', erreur);

          this.errorMessage.set(
            erreur.error?.erreur ?? 'Code invalide ou expiré.'
          );
        },
      });
  }

  onOtpSheetClosed() {
    this.showOtpSheet.set(false);
  }
}
