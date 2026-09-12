import { Component, Input } from '@angular/core';

// Les 4 styles de bouton disponibles dans toute l'application.
export type ButtonVariant = 'primary-blue' | 'primary-orange' | 'outline' | 'danger';

@Component({
  imports: [],
  selector: 'app-button-component',
  styleUrl: './button-component.css',
  templateUrl: './button-component.html',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant ='primary-blue';
  @Input() type: 'button' | 'submit' ='button';
  @Input() disabled =false;
  @Input() fullWidth =false;


  // On calcule les classes tailwind à appliquer selon le style demandé
  // Un getter se recalcule automatiquement à chaque fois
  get classesCalculees(): string {
    const base = 'rounded-xl py-3 px-5 text-[15px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

    const parLeStyle: Record<ButtonVariant, string> = {
      'primary-blue': 'bg-blue-900 text-white hover:bg-blue-950',
      'primary-orange': 'bg-orange-600 text-white hover:bg-orange-700',
      outline: 'bg-white text-blue-900 border-[1.5px] border-blue-900 hover:bg-blue-50',
      danger: 'bg-red-700 text-white hover:bg-red-800',
    };

    const largeur = this.fullWidth ? 'w-full' : '';

    return `${base} ${parLeStyle[this.variant]} ${largeur}`;
  }
}
