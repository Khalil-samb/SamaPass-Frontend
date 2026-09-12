import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OtpBottomSheetComponent } from '../otp-bottom-sheet-component/otp-bottom-sheet-component';
import { AuthStore } from '../../../core/state/auth.store';
import { User } from '../../../core/models';


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

  constructor(
    private router: Router,
    private authStore: AuthStore
  ) {}

  get isFormValid(): boolean {
    return this.firstName.trim().length >= 2 && this.phone.trim().length >= 9;
  }

  onSubmit() {
    if (!this.isFormValid) {
      this.errorMessage.set('Merci de renseigner votre nom et un numéro valide.');
      return;
    }
    this.errorMessage.set(null);
    this.showOtpSheet.set(true);
  }

  // C'est ici que l'utilisateur devient réellement "identifié" pour le reste
  // de l'application (AuthStore.currentUser ne sera plus jamais null après ça,
  // sauf déconnexion). Sans cet appel, toutes les pages qui dépendent de
  // "qui est connecté" (achat de billet, mes billets, favoris...) ne
  // fonctionnent pas.
  onOtpVerified() {
    const nouvelUtilisateur: User = {
      id: `usr-${Date.now()}`,
      phone: this.phone,
      phoneVerified: true,
      firstName: this.firstName,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.authStore.setIdentifiedUser(nouvelUtilisateur);
    this.router.navigateByUrl('/');
  }

  onOtpSheetClosed() {
    this.showOtpSheet.set(false);
  }
}
