import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-favorite-button-component',
  styleUrl: './favorite-button-component.css',
  templateUrl: './favorite-button-component.html',
})
export class FavoriteButtonComponent {
  @Input() isFavorite = false;

  // On ne change jamais isFavorite nous-mêmes ici : on prévient juste le
  // parent qu'on a été cliqué, et c'est LUI qui décide de mettre à jour la valeur.
  @Output() toggle =new EventEmitter<void>();

  onClic(){
    this.toggle.emit();
  }
}
