import { Component, Input, OnDestroy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface DiapositiveHero {
  id: string;
  imageUrl: string;
  titre: string;
}

@Component({
  imports: [RouterLink],
  standalone:true,
  selector: 'app-hero-carousel-component',
  styleUrl: './hero-carousel-component.css',
  templateUrl: './hero-carousel-component.html',
  host: {class: 'block'},
})

export class HeroCarouselComponent implements OnDestroy {
  private diapositivesSignal = signal<DiapositiveHero[]>([]);
  liste = this.diapositivesSignal.asReadonly();

  @Input() set diapositives(valeur: DiapositiveHero[]) {
    const nouvelle = valeur ?? [];
    this.diapositivesSignal.set(nouvelle);
    // Si la liste raccourcit, on ne reste pas sur une diapositive qui n'existe plus
    if (this.indexActif() >= nouvelle.length) this.indexActif.set(0);
    this.demarrer();
  }

  // Durée d'affichage de chaque image, en millisecondes
  @Input() intervalleMs = 5000;

  indexActif = signal(0);
  actuelle = computed(() => this.diapositivesSignal()[this.indexActif()] ?? null);

  // true tant que la souris est sur le bloc : on n'avance pas pendant qu'on lit
  enPause = false;

  private minuteur: ReturnType<typeof setInterval> | null = null;

  // Les personnes qui ont demandé "moins d'animations" dans leur système ne
  // voient pas défiler les images toutes seules (elles gardent les points).
  private mouvementReduit =
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  aller(index: number) {
    this.indexActif.set(index);
    this.demarrer(); // on repart de zéro : l'image choisie garde toute sa durée
  }

  private suivante() {
    const total = this.diapositivesSignal().length;
    if (total > 1) this.indexActif.set((this.indexActif() + 1) % total);
  }

  private demarrer() {
    this.arreter();
    if (typeof window === 'undefined' || this.mouvementReduit || this.diapositivesSignal().length < 2) return;

    this.minuteur = setInterval(() => {
      // Pas d'avance si la souris est dessus, ni si l'onglet est en arrière-plan
      if (!this.enPause && !document.hidden) this.suivante();
    }, this.intervalleMs);
  }

  private arreter() {
    if (this.minuteur !== null) {
      clearInterval(this.minuteur);
      this.minuteur = null;
    }
  }

  ngOnDestroy() {
    this.arreter();
  }
}

