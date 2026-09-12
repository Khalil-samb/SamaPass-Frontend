import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { City } from '../../../core/models/city.model';
import { Category } from '../../../core/models/category.model';

// ce que ce composant renvoie au parent quand clique sur Rechercher
export interface CriteresRecherche {
  motCle: string;
  cityId: string;
  categoryId: string;
}

@Component({
  imports: [FormsModule],
  standalone:true,
  selector: 'app-search-bar-component',
  styleUrl: './search-bar-component.css',
  templateUrl: './search-bar-component.html',
})
export class SearchBarComponent {

  //Les listes à afficher dans les menus déroulants, fournies par la page parente
  @Input() cities: City[] = [];
  @Input() categories: Category[] =[];

  // Ce que l'utilisateur tape/choisit, gardé directement dans le composant
  motCle = '';
  cityId = '';
  categoryId ='';

  //Prévient le parent des critéres choisit, seulement au clic sur Rechercher
  //(pas à chaque lettre tapée, pour ne pas relancer une recherche sans arrét)
  @Output() search = new EventEmitter<CriteresRecherche>();

  lancerLaRecherche(){
    this.search.emit({
      motCle: this.motCle,
      cityId: this.cityId,
      categoryId: this.categoryId
    });
  }



}
