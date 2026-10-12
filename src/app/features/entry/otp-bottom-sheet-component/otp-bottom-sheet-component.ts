
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';

@Component({
  imports: [CommonModule],
  standalone: true,
  selector: 'app-otp-bottom-sheet-component',
  styleUrl: './otp-bottom-sheet-component.css',
  templateUrl: './otp-bottom-sheet-component.html',
})
export class OtpBottomSheetComponent {

  @Input() phone = '';
  @Input() showOtpSheet = false;

  @Output() verified = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Output() resend = new EventEmitter<void>();

  digits = signal<string[]>(['', '', '', '']);
  isVerifying = signal(false);
  errorMessage = signal<string | null>(null);
  resendCooldown = signal(30);

  ngOnInit() {
    this.demarrerCompteARebours();
  }

  onDigitInput(index: number, event: Event) {
    const caseTapee = event.target as HTMLInputElement;

    const valeur = caseTapee.value
      .replace(/[^0-9]/g, '')
      .slice(-1);

    const nouveauxChiffres = [...this.digits()];
    nouveauxChiffres[index] = valeur;

    this.digits.set(nouveauxChiffres);

    if (valeur) {
      const caseSuivante =
        caseTapee.nextElementSibling as HTMLInputElement | null;

      caseSuivante?.focus();
    }

    const toutEstRempli =
      nouveauxChiffres.every((chiffre) => chiffre !== '');

    if (toutEstRempli) {
      this.verifierLeCode();
    }
  }

  onBackspace(event: KeyboardEvent) {
    const caseActuelle = event.target as HTMLInputElement;

    if (
      event.key === 'Backspace' &&
      caseActuelle.value === ''
    ) {
      const casePrecedente =
        caseActuelle.previousElementSibling as HTMLInputElement | null;

      casePrecedente?.focus();
    }
  }

  verifierLeCode() {
    const code = this.digits().join('');

    if (code.length !== 4) {
      return;
    }

    /*
     * Le composant ne vérifie plus l'OTP lui-même.
     * Il transmet simplement le code au composant parent.
     */
    this.verified.emit(code);
  }

  private demarrerCompteARebours() {
    this.resendCooldown.set(30);

    const intervalle = setInterval(() => {
      this.resendCooldown.update(
        (valeurActuelle) => valeurActuelle - 1
      );

      if (this.resendCooldown() <= 0) {
        clearInterval(intervalle);
      }
    }, 1000);
  }

  resendCode() {
    this.resend.emit();
    this.errorMessage.set(null);
    this.digits.set(['', '', '', '']);
    this.demarrerCompteARebours();
  }

  close() {
    this.closed.emit();
  }
}
