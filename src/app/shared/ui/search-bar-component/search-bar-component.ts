import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
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
export class SearchBarComponent implements OnInit, OnDestroy {

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

  // Critères déjà choisis ailleurs (accueil) : la barre les affiche au lieu de repartir vide.
  @Input() motCleInitial = '';
  @Input() villeInitiale = '';
  @Input() categorieInitiale = '';

  ngOnInit() {
    this.motCle = this.motCleInitial;
    this.cityId = this.villeInitiale;
    this.categoryId = this.categorieInitiale;
  }

  // Recherche en direct : on attend 200 ms après la dernière lettre pour ne pas relancer à chaque frappe.
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  rechercheEnDirect() {
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.lancerLaRecherche(), 200);
  }

  ngOnDestroy() {
    clearTimeout(this.minuterie);
  }

  lancerLaRecherche(){
    this.search.emit({
      motCle: this.motCle,
      cityId: this.cityId,
      categoryId: this.categoryId
    });
  }



}
