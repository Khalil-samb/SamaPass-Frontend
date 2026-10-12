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
import { filter } from 'rxjs';
import { AdminDataStore } from '../../core/state/admin-data.store';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationsStore } from '../../core/state/notifications.state';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent, IconName } from '../../shared/ui/icon-component/icon-component';
import { ChatbotWidgetComponent } from '../../shared/ui/chatbot-widget-component/chatbot-widget-component';


interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

// Même seuil que le « lg » de Tailwind (64rem = 1024 px) : au-dessus, la barre
// latérale est toujours visible ; en dessous, c'est un tiroir.
const LARGEUR_ORDINATEUR = 1024;

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, ChatbotWidgetComponent],
  standalone: true,
  selector: 'app-admin-layout-component',
  styleUrl: './admin-layout-component.css',
  templateUrl: './admin-layout-component.html',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  // ⚠️ Nouveau : le tiroir de navigation, sur téléphone uniquement.
  sidebarOuverte = signal(false);

  private boutonMenu = viewChild<ElementRef<HTMLButtonElement>>('boutonMenu');
  private boutonFermer = viewChild<ElementRef<HTMLButtonElement>>('boutonFermer');
  private injector = inject(Injector);

  // ⚠️ "6" a disparu : plus aucun badge écrit en dur nulle part. Le vrai
  // compteur vient de notificationsStore.nonLues(), lu directement dans le
  // template pour l'entrée "Notifications" (voir le .html).
  navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/admin', icon: 'bar-chart-3' },
    { label: 'Utilisateurs', path: '/admin/utilisateurs',icon: 'circle-user-round' },
    { label: 'Organisateurs', path: '/admin/organisateurs', icon: 'wallet' },
    { label: 'Notifications', path: '/admin/notifications', icon: 'bell' },
    { label: 'Paramètres', path: '/admin/parametres', icon: 'settings' },
  ];

  constructor(
    public adminStore: AdminDataStore,
    public authStore: AuthStore,
    public notificationsStore: NotificationsStore,
    private router: Router
  ) {
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
    this.adminStore.charger();
    // Démarre le suivi en arrière-plan (vérification toutes les 20 s), même
    // si l'admin ne visite jamais la page "Notifications" elle-même : le
    // badge reste à jour pendant qu'il navigue ailleurs dans l'espace admin.
    this.notificationsStore.utiliser();
  }

  ngOnDestroy() {
    this.notificationsStore.liberer();
    // Quitter l'espace admin avec le tiroir ouvert ne doit jamais laisser la
    // page suivante bloquée sans défilement.
    if (typeof document !== 'undefined') document.body.classList.remove('overflow-hidden');
  }

  initiales(): string {
    return (this.authStore.currentUser()?.firstName[0] ??'?').toUpperCase();
  }

  seDeconnecter() {
    this.authStore.logout();
    this.router.navigateByUrl('/admin/connexion');
  }

  // ═════════════ Tiroir de navigation (téléphone) ═════════════

  ouvrirSidebar() {
    this.sidebarOuverte.set(true);
    // Le clavier et les lecteurs d'écran doivent entrer DANS le tiroir
    afterNextRender(() => this.boutonFermer()?.nativeElement.focus(), { injector: this.injector });
  }

  fermerSidebar(rendreLeFocus = true) {
    if (!this.sidebarOuverte()) return;
    this.sidebarOuverte.set(false);
    // Fermé au clavier ou au voile : on revient sur le bouton qui l'avait ouvert
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
  }

  // Écran qui s'élargit (téléphone tourné, fenêtre agrandie) : la barre latérale
  // redevient fixe, le tiroir et son voile n'ont plus lieu d'être.
  @HostListener('window:resize')
  surRedimensionnement() {
    if (window.innerWidth >= LARGEUR_ORDINATEUR) this.fermerSidebar(false);
  }
}
