import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { AuthStore } from '../../../core/state/auth.store';

// Fond : un halo radial qui « respire » lentement (sombre au centre, lueur orange vers les bords).
const ECHELLE_DEPART = 125; // taille de départ du halo, en %
const AMPLITUDE = 5; // de combien il se dilate et se contracte
const VITESSE = 0.03; // plus petit = plus lent
const COULEURS = ['#020617', '#0b1220', '#3b1608', '#7c2d12', '#c2410c', '#ea580c'];
const PALIERS = [38, 52, 64, 76, 90, 100];

@Component({
  imports: [RouterLink],
  standalone: true,
  selector: 'app-not-found-component',
  styleUrl: './not-found-component.css',
  templateUrl: './not-found-component.html',
})
export class NotFoundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fond', { static: true }) private fond!: ElementRef<HTMLDivElement>;

  adresse = '';
  private image = 0;

  constructor(
    private router: Router,
    private location: Location,
    private titre: Title,
    private zone: NgZone,
    public authStore: AuthStore
  ) {
    this.titre.setTitle('404 · Page introuvable | Kcrowd');
    try {
      this.adresse = decodeURIComponent(this.router.url);
    } catch {
      this.adresse = this.router.url;
    }
  }

  // Lien vers l'espace de travail de la personne connectée (organisateur ou administrateur).
  get espace(): { label: string; path: string } | null {
    const role = this.authStore.currentUser()?.role;
    if (role === 'organizer') return { label: 'Mon espace organisateur', path: '/organisateur' };
    if (role === 'admin') return { label: "Espace administrateur", path: '/admin' };
    return null;
  }

  retour() {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  ngAfterViewInit() {
    const element = this.fond.nativeElement;
    const paliers = COULEURS.map((couleur, i) => `${couleur} ${PALIERS[i]}%`).join(', ');
    const dessiner = (taille: number) => {
      element.style.background = `radial-gradient(${taille}% ${taille}% at 50% 18%, ${paliers})`;
    };
    dessiner(ECHELLE_DEPART);

    const reduit = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduit) return;

    // Hors d'Angular : 60 images par seconde n'ont pas à déclencher de détection de changements.
    this.zone.runOutsideAngular(() => {
      let taille = ECHELLE_DEPART;
      let sens = 1;
      let compteur = 0;
      const boucle = () => {
        if (taille >= ECHELLE_DEPART + AMPLITUDE) sens = -1;
        if (taille <= ECHELLE_DEPART - AMPLITUDE) sens = 1;
        taille += sens * VITESSE;
        if (++compteur % 2 === 0) dessiner(taille); // une image sur deux suffit, c'est plus léger
        this.image = requestAnimationFrame(boucle);
      };
      this.image = requestAnimationFrame(boucle);
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.image);
    this.titre.setTitle('Kcrowd');
  }
}
