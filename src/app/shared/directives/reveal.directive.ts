import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Apparition progressive au défilement (scroll-reveal).
 *
 * Usage :   <div appReveal>…</div>            → apparaît quand il entre dans l'écran
 *           <div [appReveal]="120">…</div>    → idem, avec 120 ms de retard (effet « cascade »)
 *
 * Principe : un IntersectionObserver (API du navigateur) prévient quand l'élément entre dans la
 * zone visible. On lui ajoute alors la classe CSS `is-visible` ; la transition est dans glass.css.
 * L'élément n'est observé qu'une fois : après son apparition il reste affiché.
 *
 * Sécurité : si le navigateur ne connaît pas IntersectionObserver, la classe `reveal` (qui cache
 * l'élément) n'est jamais ajoutée → la page reste lisible. Les personnes qui ont demandé
 * « réduire les animations » (prefers-reduced-motion) voient tout de suite le contenu (règle CSS).
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements OnInit, OnDestroy {
  /** Retard en millisecondes (utile pour décaler les cartes d'une même rangée). */
  @Input() appReveal: number | string | '' = 0;

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer: IntersectionObserver | null = null;

  ngOnInit() {
    if (typeof IntersectionObserver === 'undefined') return;

    const retard = Number(this.appReveal) || 0;
    if (retard > 0) this.el.style.setProperty('--reveal-delay', `${retard}ms`);
    this.el.classList.add('reveal');

    this.observer = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          this.el.classList.add('is-visible');
          this.observer?.disconnect();
          this.observer = null;
        }
      },
      // 0 = dès qu'un pixel est visible (indispensable pour les très grands blocs) ;
      // la marge basse fait démarrer l'animation un peu AVANT le bord de l'écran.
      { threshold: 0, rootMargin: '0px 0px -6% 0px' }
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.observer = null;
  }
}
