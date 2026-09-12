import { Component, Input } from '@angular/core';

//Une étape = un titre + une description. La liste compléte est fournie
//Par la page qui utilise ce composant (l'acceuil, la landing organisateur...)
// donc ce composant ne connait jamais le contenu à l 'avance.
export interface EtapeExplicative{
  title: string;
  description:string;
}


@Component({
  imports: [],
  standalone:true,
  selector: 'app-how-it-works-steps-component',
  styleUrl: './how-it-works-steps-component.css',
  templateUrl: './how-it-works-steps-component.html',
})
export class HowItWorksStepsComponent {
  @Input() title = 'Comment ça marche ?';
  @Input({ required:true}) steps: EtapeExplicative[]= [];
}
