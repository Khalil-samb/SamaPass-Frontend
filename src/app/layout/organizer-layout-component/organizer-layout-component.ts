import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { SelectedEventStore } from '../../core/state/selected-event.store';
import { IconComponent, IconName } from '../../shared/ui/icon-component/icon-component';
import { BadgeStatusComponent } from '../../shared/ui/badge-status-component/badge-status-component';
import { ChatbotWidgetComponent } from '../../shared/ui/chatbot-widget-component/chatbot-widget-component';
//  Nouveau : remplace le bouton cloche statique du header, jusqu'ici sans
// aucun effet au clic.
import { NotificationBellComponent } from '../../shared/ui/notification-bell-component/notification-bell-component';


interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  badge?: string;
  isLive?: boolean;
}

// Même seuil que le « lg » de Tailwind (64rem = 1024 px) : au-dessus, la barre
// latérale est toujours visible ; en dessous, c'est un tiroir.
const LARGEUR_ORDINATEUR = 1024;

@Component({
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IconComponent,
    BadgeStatusComponent,
    ChatbotWidgetComponent,
    NotificationBellComponent,
  ],
  standalone: true,
  selector: 'app-organizer-layout-component',
  styleUrl: './organizer-layout-component.css',
  templateUrl: './organizer-layout-component.html',
})
export class OrganizerLayoutComponent implements OnInit, OnDestroy {
  // Le sélecteur d'événement dans l'en-tête (inchangé)
  menuOuvert = signal(false);

  // Nouveau : le tiroir de navigation, sur téléphone uniquement. Distinct de
  // menuOuvert, qui ne concerne que la liste déroulante des événements.
  sidebarOuverte = signal(false);

  private boutonMenu = viewChild<ElementRef<HTMLButtonElement>>('boutonMenu');
  private boutonFermer = viewChild<ElementRef<HTMLButtonElement>>('boutonFermer');
  private injector = inject(Injector);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/organisateur', icon: 'bar-chart-3' },
    { label: 'Mes événements', path: '/organisateur/evenements', icon: 'calendar' },
    { label: 'Ventes & Billets', path: '/organisateur/ventes', icon: 'ticket' },
    { label: 'Scanner de contrôle', path: '/organisateur/scanner', icon: 'qr-code' },
    { label: 'Campagnes & Pubs', path: '/organisateur/campagnes', icon: 'trending-up' },
    { label: 'Reversements Wave/OM', path: '/organisateur/reversements', icon: 'wallet' },
  ];

  // Nom affiché : celui de l'organisation (jamais un nom écrit en dur)
  nomOrganisation() {
    return this.eventStore.organizer()?.organizationName || 'Mon organisation';
  }

  // Logo de l'organisateur (null → on affiche les initiales)
  logoUrl(): string | null {
    return (this.eventStore.organizer() as unknown as { logoUrl?: string } | null)?.logoUrl || null;
  }

  initiales() {
    const nom = this.eventStore.organizer()?.organizationName ?? '';
    return nom.slice(0, 2).toUpperCase() || '··';
  }

  constructor(public eventStore: SelectedEventStore) {
    // Tiroir ouvert : la page derrière ne doit plus défiler
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.classList.toggle('overflow-hidden', this.sidebarOuverte());
    });

    // Toute navigation referme le tiroir
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.fermerSidebar(false));
  }

  ngOnInit() {
    this.eventStore.charger();
  }

  ngOnDestroy() {
    // Quitter l'espace organisateur avec le tiroir ouvert ne doit jamais
    // laisser la page publique bloquée sans défilement.
    if (typeof document !== 'undefined') document.body.classList.remove('overflow-hidden');
  }

  choisir(eventId: string) {
    this.eventStore.selectionner(eventId);
    this.menuOuvert.set(false);
  }

  // ═════════════ Tiroir de navigation (téléphone) ═════════════

  ouvrirSidebar() {
    this.menuOuvert.set(false);
    this.sidebarOuverte.set(true);
    // Le clavier et les lecteurs d'écran doivent entrer DANS le tiroir
    afterNextRender(() => this.boutonFermer()?.nativeElement.focus(), { injector: this.injector });
  }

  fermerSidebar(rendreLeFocus = true) {
    if (!this.sidebarOuverte()) return;
    this.sidebarOuverte.set(false);
    // Fermé au clavier ou au fond : on revient sur le bouton qui l'avait ouvert
    if (rendreLeFocus) {
      afterNextRender(() => this.boutonMenu()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  // Un clic sur n'importe quel lien du tiroir le referme. Indispensable pour le
  // lien de la page DÉJÀ affichée : il ne déclenche aucune navigation, donc
  // rien d'autre ne refermerait le tiroir.
  surClicSidebar(event: Event) {
    const cible = event.target as HTMLElement | null;
    if (cible?.closest('a')) this.fermerSidebar(false);
  }

  @HostListener('document:keydown.escape')
  surEchap() {
    if (this.sidebarOuverte()) this.fermerSidebar();
    else if (this.menuOuvert()) this.menuOuvert.set(false);
  }

  // Écran qui s'élargit (téléphone tourné, fenêtre agrandie) : la barre latérale
  // redevient fixe, le tiroir et son voile n'ont plus lieu d'être.
  @HostListener('window:resize')
  surRedimensionnement() {
    if (window.innerWidth >= LARGEUR_ORDINATEUR) this.fermerSidebar(false);
  }
}

