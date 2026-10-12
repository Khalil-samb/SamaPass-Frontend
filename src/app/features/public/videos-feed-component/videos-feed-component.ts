import { Component, ElementRef, OnDestroy, computed, effect, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Video } from '../../../core/models/video.model';
import { VideosService } from '../../../core/services/videos.service';
import { AuthStore } from '../../../core/state/auth.store';

// Une vue est comptée quand la vidéo est restée affichée quelques secondes (pas pour un simple défilement).
const DELAI_VUE_MS = 3000;

@Component({
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  selector: 'app-videos-feed-component',
  templateUrl: './videos-feed-component.html',
  host: {
    '(document:keydown)': 'surTouche($event)',
    '(document:pointerdown)': 'surGeste($event)',
  },
})
export class VideosFeedComponent implements OnDestroy {
  // ── Données ──
  videos = signal<Video[]>([]);
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // ── Lecture ──
  indexCourant = signal(0);
  // Le son est ACTIVÉ par défaut. Si le navigateur refuse de démarrer une vidéo avec du son (cas d'une page ouverte
  // directement, sans aucun clic avant), on bascule en sourdine pour que la vidéo démarre quand même,
  // et le premier toucher de l'écran rétablit le son (voir surGeste).
  muet = signal(false);
  sonBloque = signal(false);      // vrai = le navigateur a refusé le son en attendant un geste de la personne
  enPause = signal(false);
  progression = signal(0);        // 0 à 100, pour la barre fine sous la vidéo
  estBureau = signal(false);      // grand écran : lecteur + liste ; sinon défilement plein écran façon TikTok

  // ── J'aime ──
  invitationConnexion = signal(false);

  delaiVueMs = DELAI_VUE_MS;

  courant = computed(() => this.videos()[this.indexCourant()] ?? null);
  // Liste de droite (écran large) : toutes les autres vidéos, avec leur place dans le fil.
  autres = computed(() =>
    this.videos()
      .map((video, index) => ({ video, index }))
      .filter((x) => x.index !== this.indexCourant())
  );

  private vuesComptees = new Set<string>();
  private jaimeEnCours = new Set<string>();
  private minuteurVue: ReturnType<typeof setTimeout> | null = null;
  private observateur: IntersectionObserver | null = null;
  private ecranLarge: MediaQueryList | null = null;
  private surChangementEcran = (e: MediaQueryListEvent) => this.estBureau.set(e.matches);

  constructor(
    private videosService: VideosService,
    public authStore: AuthStore,
    private router: Router,
    private route: ActivatedRoute,
    private hote: ElementRef<HTMLElement>
  ) {
    if (typeof matchMedia === 'function') {
      this.ecranLarge = matchMedia('(min-width: 1024px)');
      this.estBureau.set(this.ecranLarge.matches);
      this.ecranLarge.addEventListener?.('change', this.surChangementEcran);
    }

    // À chaque changement de vidéo, de son ou de mise en page : on cale la lecture et on relance le compteur de vue.
    effect(() => {
      const actuelle = this.courant();
      this.muet();
      this.estBureau();
      untracked(() => {
        this.armerLeCompteurDeVue(actuelle?.id ?? null);
        setTimeout(() => this.synchroniser(), 0);   // attend que l'écran soit mis à jour
      });
    });

    this.charger();
  }

  ngOnDestroy() {
    if (this.minuteurVue) clearTimeout(this.minuteurVue);
    this.observateur?.disconnect();
    this.ecranLarge?.removeEventListener?.('change', this.surChangementEcran);
  }

  // ═════════════ Chargement ═════════════

  charger() {
    this.chargement.set(true);
    this.erreur.set(null);
    this.videosService.getFil().subscribe({
      next: (liste) => {
        this.videos.set(liste);
        // Arrivée depuis une fiche événement : /videos?video=<id> démarre sur cette vidéo.
        const demandee = this.route.snapshot?.queryParamMap?.get('video');
        const position = demandee ? liste.findIndex((v) => v.id === demandee) : -1;
        this.indexCourant.set(position >= 0 ? position : 0);
        this.chargement.set(false);
        setTimeout(() => {
          if (position > 0 && !this.estBureau()) this.defiler(position, false);
          this.synchroniser();
        }, 0);
      },
      error: () => {
        this.erreur.set('Impossible de charger les vidéos. Vérifiez votre connexion et réessayez.');
        this.chargement.set(false);
      },
    });
  }

  // ═════════════ Navigation dans le fil ═════════════

  aller(index: number) {
    const liste = this.videos();
    if (index < 0 || index >= liste.length || index === this.indexCourant()) return;
    this.indexCourant.set(index);
    this.progression.set(0);
    this.enPause.set(false);
    if (!this.estBureau()) this.defiler(index, true);
  }

  suivante() { this.aller(this.indexCourant() + 1); }
  precedente() { this.aller(this.indexCourant() - 1); }

  private defiler(index: number, douceur: boolean) {
    const cible = this.hote.nativeElement.querySelector(`[data-slide][data-index="${index}"]`) as HTMLElement | null;
    cible?.scrollIntoView?.({ behavior: douceur ? 'smooth' : 'auto', block: 'start' });
  }

  // Seules la vidéo affichée et ses voisines téléchargent : un fil de 100 vidéos ne doit pas tout charger d'un coup.
  proche(index: number): boolean {
    return Math.abs(index - this.indexCourant()) <= 1;
  }

  surTouche(e: KeyboardEvent) {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowDown': case 'j': e.preventDefault(); this.suivante(); break;
      case 'ArrowUp': case 'k': e.preventDefault(); this.precedente(); break;
      case ' ': e.preventDefault(); this.basculerLectureCourante(); break;
      case 'm': this.basculerSon(); break;
      case 'f': if (this.estBureau()) this.pleinEcran(); break;
    }
  }

  // ═════════════ Lecture ═════════════

  private lecteurs(): HTMLVideoElement[] {
    return Array.from(this.hote.nativeElement.querySelectorAll('video[data-id]')) as HTMLVideoElement[];
  }

  private lecteurCourant(): HTMLVideoElement | null {
    const id = this.courant()?.id;
    return this.lecteurs().find((v) => v.dataset['id'] === id) ?? null;
  }

  // Lit la vidéo affichée, met les autres en pause, et (sur mobile) observe quelle vidéo occupe l'écran.
  synchroniser() {
    const id = this.courant()?.id;
    for (const lecteur of this.lecteurs()) {
      if (lecteur.dataset['id'] === id) {
        lecteur.muted = this.muet();
        lecteur.volume = 1;
        try {
          lecteur.play?.()?.catch?.(() => {
            if (!this.muet()) {
              // Démarrage avec le son refusé : on passe en sourdine (l'effet relance la lecture) et on invite à toucher l'écran
              this.sonBloque.set(true);
              this.muet.set(true);
            } else {
              this.enPause.set(true);
            }
          });
        } catch { /* navigateur sans lecture : rien à faire */ }
      } else {
        try { lecteur.pause?.(); } catch { /* idem */ }
      }
    }
    this.observerLesPages();
  }

  private observerLesPages() {
    this.observateur?.disconnect();
    this.observateur = null;
    if (this.estBureau() || typeof IntersectionObserver === 'undefined') return;
    this.observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting || e.intersectionRatio < 0.6) continue;
          const index = Number((e.target as HTMLElement).dataset['index']);
          if (!Number.isNaN(index) && index !== this.indexCourant()) {
            this.indexCourant.set(index);
            this.progression.set(0);
            this.enPause.set(false);
          }
        }
      },
      { threshold: [0.6] }
    );
    this.hote.nativeElement.querySelectorAll('[data-slide]').forEach((page) => this.observateur!.observe(page));
  }

  basculerLecture(lecteur: HTMLVideoElement) {
    if (lecteur.paused) {
      try { lecteur.play?.()?.catch?.(() => {}); } catch { /* idem */ }
    } else {
      lecteur.pause?.();
    }
  }

  basculerLectureCourante() {
    const lecteur = this.lecteurCourant();
    if (lecteur) this.basculerLecture(lecteur);
  }

  surLecture(id: string) { if (id === this.courant()?.id) this.enPause.set(false); }
  surPause(id: string) { if (id === this.courant()?.id) this.enPause.set(true); }

  surProgression(lecteur: HTMLVideoElement, id: string) {
    if (id !== this.courant()?.id || !lecteur.duration || !isFinite(lecteur.duration)) return;
    this.progression.set(Math.min(100, (100 * lecteur.currentTime) / lecteur.duration));
  }

  chercher(e: MouseEvent, barre: HTMLElement) {
    const lecteur = this.lecteurCourant();
    if (!lecteur || !lecteur.duration || !isFinite(lecteur.duration)) return;
    const zone = barre.getBoundingClientRect();
    if (!zone.width) return;
    const part = Math.min(1, Math.max(0, (e.clientX - zone.left) / zone.width));
    lecteur.currentTime = part * lecteur.duration;
    this.progression.set(part * 100);
  }

  // Une vidéo en hauteur remplit l'écran du téléphone ; une vidéo en largeur reste entière, bandes noires comprises.
  cadrer(lecteur: HTMLVideoElement) {
    lecteur.style.objectFit = !this.estBureau() && lecteur.videoHeight > lecteur.videoWidth ? 'cover' : 'contain';
  }

  basculerSon() {
    this.sonBloque.set(false);
    this.muet.update((m) => !m);
  }

  // Premier geste de la personne quand le son était bloqué : on le rétablit (un geste suffit à l'autoriser).
  // Le bouton « son » gère lui-même son clic : on l'ignore ici pour ne pas annuler son effet.
  surGeste(e: Event) {
    if (!this.sonBloque()) return;
    if ((e.target as HTMLElement | null)?.closest?.('[data-son]')) return;
    this.sonBloque.set(false);
    this.muet.set(false);
  }

  pleinEcran(zone?: HTMLElement) {
    const element = zone ?? (this.hote.nativeElement.querySelector('[data-lecteur-principal]') as HTMLElement | null);
    if (!element) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else element.requestFullscreen?.();
  }

  // ═════════════ Vues ═════════════

  private armerLeCompteurDeVue(id: string | null) {
    if (this.minuteurVue) clearTimeout(this.minuteurVue);
    this.minuteurVue = null;
    if (!id || this.vuesComptees.has(id)) return;
    this.minuteurVue = setTimeout(() => this.compterVue(id), this.delaiVueMs);
  }

  private compterVue(id: string) {
    if (this.vuesComptees.has(id) || this.courant()?.id !== id) return;
    this.vuesComptees.add(id);   // une seule fois par vidéo et par visite, même si l'appel échoue
    this.videosService.compterUneVue(id).subscribe({
      next: (r) => this.modifier(id, { viewsCount: r.viewsCount }),
      error: () => { /* une vue perdue n'est pas grave */ },
    });
  }

  // ═════════════ J'aime ═════════════

  basculerJaime(video: Video) {
    if (!this.authStore.isIdentified()) {
      this.invitationConnexion.set(true);
      return;
    }
    if (this.jaimeEnCours.has(video.id)) return;
    this.jaimeEnCours.add(video.id);

    const avant = { likedByMe: video.likedByMe, likesCount: video.likesCount };
    const veutAimer = !video.likedByMe;
    // Affichage immédiat, puis on remplace par la valeur réelle du serveur.
    this.modifier(video.id, { likedByMe: veutAimer, likesCount: Math.max(0, video.likesCount + (veutAimer ? 1 : -1)) });

    const appel = veutAimer ? this.videosService.aimer(video.id) : this.videosService.nePlusAimer(video.id);
    appel.subscribe({
      next: (r) => {
        this.modifier(video.id, { likedByMe: r.liked, likesCount: r.likesCount });
        this.jaimeEnCours.delete(video.id);
      },
      error: (erreur) => {
        this.modifier(video.id, avant);
        this.jaimeEnCours.delete(video.id);
        if (erreur?.status === 401 || erreur?.status === 403) this.invitationConnexion.set(true);
      },
    });
  }

  allerSeConnecter() {
    this.invitationConnexion.set(false);
    this.router.navigateByUrl('/bienvenue');
  }

  fermerInvitation() {
    this.invitationConnexion.set(false);
  }

  private modifier(id: string, changement: Partial<Video>) {
    this.videos.update((liste) => liste.map((v) => (v.id === id ? { ...v, ...changement } : v)));
  }

  // ═════════════ Affichage ═════════════

  formaterCompteur(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return (n < 10_000 ? (n / 1000).toFixed(1) : Math.round(n / 1000).toString()).replace('.0', '').replace('.', ',') + ' k';
    return (n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',') + ' M';
  }

  initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('') || '?';
  }

  formaterDate(dateISO: string): string {
    if (!dateISO) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(dateISO));
  }

  retour() {
    if (history.length > 1) history.back();
    else this.router.navigateByUrl('/');
  }
}
