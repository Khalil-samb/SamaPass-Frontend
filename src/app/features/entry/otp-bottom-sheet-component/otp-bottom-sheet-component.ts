import { CommonModule } from '@angular/common';
import { OtpService } from './../../../core/services/opt.service';
import { Component, ElementRef, EventEmitter, Input, output, Output, QueryList, signal, ViewChildren } from '@angular/core';

@Component({
  imports: [CommonModule],
  standalone:true,
  selector: 'app-otp-bottom-sheet-component',
  styleUrl: './otp-bottom-sheet-component.css',
  templateUrl: './otp-bottom-sheet-component.html',
})
export class OtpBottomSheetComponent {
  // le numéro de téléphone reçu depuis PhoneEntryComponent
  @Input({ required: true }) phone!: string;


  //deux "signaux" que l'on envoie vers l'extérieur pour prévenir le parent
  // -verified: le code etait bon, l'utilisateur peux continuer
  //-closed:  l'utilisateur a fermé le panneau sans valider
  @Output() verified = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  //le code à 4 chiffre, Au depart c'est vide
  digits = signal<string[]>(['', '', '', '']);


  isVerifying = signal(false);
  errorMessage = signal<string |null>(null);
  resendCooldown = signal(30);// seconde avant de pouvoir renvoyer le code

  constructor(private OtpService: OtpService){}

  //Dés que le panneau s'affiche à l'ecran, on "envoie" le code
  async ngOnInit(){
    await this.OtpService.sendCode(this.phone);
    this.demarrerCompteARebours();
  }

  //Appelé à chaque fois que l'utilisateur tape un chiffre dans une case
  onDigitInput(index: number, event: Event){
    const CaseTapee = event.target as HTMLInputElement;

    //On grade uniquement les chiffre, et un seul caractére max par case
    const valeur = CaseTapee.value.replace(/[^0-9]/g, '').slice(-1);

    //on met à jour le tableau des 4 chiffres, à la bonne position
    const nouveauxChiffres = [...this.digits()];
    nouveauxChiffres[index] = valeur;
    this.digits.set(nouveauxChiffres);

    //Si on vient de taper un chiffre, on saute automatiquement à la case suivante
    if (valeur){
      const caseSuivante = CaseTapee.nextElementSibling as HTMLInputElement | null;
      caseSuivante?.focus();
    }

    //Si les 4 case sont remplies , on vérifie automatiquement, sans bouton à cliquer
    const toutEstRempli = nouveauxChiffres.every((chiffre) => chiffre !=='');
    if(toutEstRempli){
      this.verifierLeCode();
    }
  }

    // Appelée quand l'utilisateur appuie sur 'retour arriére'
  onBackspace(event: KeyboardEvent){
    const caseActuelle = event.target as HTMLInputElement;
    const caseEstVide = caseActuelle.value === '';

    if(event.key === 'Backspace' && caseEstVide){
      const casePrecedente = caseActuelle.previousElementSibling as HTMLInputElement | null;
      casePrecedente?.focus();
    }
  }


  async verifierLeCode(){
    const code = this.digits().join('');


    this.isVerifying.set(true);
    this.errorMessage.set(null);

    const cadeEstCorrect = await this.OtpService.verifyCode(this.phone, code);

    this.isVerifying.set(false);

    if(cadeEstCorrect){
      this.verified.emit(); // on previent PhoneEntryComponent : C'est bon !
    }else {
      this.errorMessage.set('Code incorrect, réessayer.');
      this.digits.set(['', '', '', '']); // on vide les cases pour recommencer
    }
  }

  async resendCode(){
    if (this.resendCooldown() > 0) return;
    await this.OtpService.sendCode(this.phone);
    this.demarrerCompteARebours();
  }


  //Fait déompter reesendCooldown de 30 à 0, seconde par seconde
  private demarrerCompteARebours(){
    this.resendCooldown.set(30);
    const intervalle = setInterval(()=> {
      this.resendCooldown.update((valeurActuelle) => valeurActuelle - 1);
      if (this.resendCooldown() <= 0) clearInterval(intervalle);
    }, 1000);
  }

  close(){
    this.closed.emit()
  }
}
