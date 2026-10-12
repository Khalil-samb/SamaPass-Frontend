import { Routes } from '@angular/router';

import { organizerGuard, adminGuard } from './core/guards/auth.guards';

// ═══════════════════════════════════════════════════════════════════════════
// CHARGEMENT À LA DEMANDE (lazy loading)
//
// Avant, TOUTES les pages étaient importées ici en haut du fichier : le
// navigateur téléchargeait d'un coup le code de l'espace organisateur et de
// l'espace administrateur — même pour un simple visiteur de la page d'accueil.
//
// Maintenant, seul ce qui sert à afficher l'ACCUEIL est chargé au départ
// (le gabarit public et la page d'accueil). Chaque autre page n'est
// téléchargée qu'au moment où on y va, via  loadComponent: () => import(...).
// Conséquences :
//   - la page d'accueil se charge plus vite ;
//   - un visiteur ne reçoit jamais le code des espaces organisateur / admin ;
//   - le build de production ne dépasse plus le plafond de taille.
// ═══════════════════════════════════════════════════════════════════════════

// Chargés au départ, volontairement : c'est la toute première chose affichée.
import { PublicLayoutComponent } from './layout/public-layout-component/public-layout-component';
import { HomeComponent } from './features/public/home-component/home-component';

export const routes: Routes = [

  // Porte d'entrée — accessible directement, aucune protection pour l'instant
  {
    path: 'bienvenue',
    loadComponent: () => import('./features/entry/phone-entry-component/phone-entry-component').then((m) => m.PhoneEntryComponent),
  },

  // Fil vidéo plein écran : hors du gabarit public, il a son propre cadre (bouton Retour intégré)
  {
    path: 'videos',
    loadComponent: () => import('./features/public/videos-feed-component/videos-feed-component').then((m) => m.VideosFeedComponent),
  },

  // ───────────── ESPACE PUBLIC + UTILISATEUR ─────────────
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      {
        path: 'evenements',
        loadComponent: () => import('./features/public/search-results-component/search-results-component').then((m) => m.SearchResultsComponent),
      },
      {
        path: 'evenements/:id',
        loadComponent: () => import('./features/public/event-detail-component/event-detail-component').then((m) => m.EventDetailComponent),
      },
      {
        path: 'billet/:ticketId/confirmation',
        loadComponent: () => import('./features/public/ticket-confimation-component/ticket-confimation-component').then((m) => m.TicketConfirmationComponent),
      },

      // Utilisateur identifié
      {
        path: 'compte/profil',
        loadComponent: () => import('./features/user/profile-component/profile-component').then((m) => m.ProfileComponent),
      },
      {
        path: 'compte/mes-billets',
        loadComponent: () => import('./features/user/my-tickets-component/my-tickets-component').then((m) => m.MyTicketsComponent),
      },
      {
        path: 'compte/favoris',
        loadComponent: () => import('./features/user/favorites-component/favorites-component').then((m) => m.FavoritesComponent),
      },
      {
        path: 'compte/notifications',
        loadComponent: () => import('./features/user/notifications-list-component/notifications-list-component').then((m) => m.NotificationsListComponent),
      },
    ],
  },

  // ───────────── DEVENIR ORGANISATEUR — PAS de PublicLayoutComponent ─────────────
  // Ces pages ont leur propre en-tête minimal (logo + "Quitter"), volontairement
  // isolées de la navigation principale du site — c'est un tunnel de conversion,
  // pas une page comme les autres.
  {
    path: 'devenir-organisateur',
    loadComponent: () => import('./features/become-organizer/become-organizer-landing-component/become-organizer-landing-component').then((m) => m.BecomeOrganizerLandingComponent),
  },
  {
    path: 'devenir-organisateur/inscription',
    loadComponent: () => import('./features/become-organizer/organizer-application-form-component/organizer-application-form-component').then((m) => m.OrganizerApplicationFormComponent),
  },
  {
    path: 'devenir-organisateur/bienvenue',
    loadComponent: () => import('./features/become-organizer/organizer-welcome-component/organizer-welcome-component').then((m) => m.OrganizerWelcomeComponent),
  },

  // ───────────── CONNEXIONS ─────────────
  //  Jamais protégées par une garde, sinon impossible de jamais atteindre
  // la page de connexion elle-même (boucle de redirection infinie).
  {
    path: 'organisateur/connexion',
    loadComponent: () => import('./features/organizer/organizer-login-component/organizer-login-component').then((m) => m.OrganizerLoginComponent),
  },
  {
    path: 'admin/connexion',
    loadComponent: () => import('./features/admin/admin-login-component/admin-login-component').then((m) => m.AdminLoginComponent),
  },

  // ───────────── ESPACE ORGANISATEUR (protégé) ─────────────
  //  canActivate posée ICI, sur la route PARENTE : elle protège
  // automatiquement toutes les sous-pages en dessous (tableau de bord,
  // événements, ventes, scanner...) en un seul endroit — inutile de la
  // répéter sur chaque enfant.
  // La garde s'exécute AVANT le chargement du code : une personne non
  // autorisée est redirigée sans même télécharger l'espace organisateur.
  {
    path: 'organisateur',
    canActivate: [organizerGuard],
    loadComponent: () => import('./layout/organizer-layout-component/organizer-layout-component').then((m) => m.OrganizerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/organizer/organizer-dashboard-component/organizer-dashboard-component').then((m) => m.OrganizerDashboardComponent),
      },
      {
        path: 'evenements',
        loadComponent: () => import('./features/organizer/my-events-list-component/my-events-list-component').then((m) => m.MyEventsListComponent),
      },
      {
        path: 'evenements/nouveau',
        loadComponent: () => import('./features/organizer/event-wizard-component/event-wizard-component').then((m) => m.EventWizardComponent),
      },
      {
        path: 'evenements/:id/publie',
        loadComponent: () => import('./features/organizer/event-published-component/event-published-component').then((m) => m.EventPublishedComponent),
      },
      {
        path: 'evenements/:id/modifier',
        loadComponent: () => import('./features/organizer/event-edit-component/event-edit-component').then((m) => m.EventEditComponent),
      },
      {
        path: 'ventes',
        loadComponent: () => import('./features/organizer/event-sales-detail-component/event-sales-detail-component').then((m) => m.EventSalesDetailComponent),
      },
      {
        path: 'scanner',
        loadComponent: () => import('./features/organizer/event-supervision-component/event-supervision-component').then((m) => m.EventSupervisionComponent),
      },
      {
        path: 'scanner/camera',
        loadComponent: () => import('./features/organizer/ticket-scanner-component/ticket-scanner-component').then((m) => m.TicketScannerComponent),
      },
      {
        path: 'campagnes',
        loadComponent: () => import('./features/organizer/sponsored-ad-component/sponsored-ad-component').then((m) => m.SponsoredAdComponent),
      },
      {
        path: 'reversements',
        loadComponent: () => import('./features/organizer/payouts-component/payouts-component').then((m) => m.PayoutsComponent),
      },
      {
        path: 'parametres',
        loadComponent: () => import('./features/organizer/organizer-settings-component/organizer-settings-component').then((m) => m.OrganizerSettingsComponent),
      },
    ],
  },

  // ───────────── ESPACE ADMINISTRATEUR (protégé) ─────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-layout-component/admin-layout-component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/admin-dashboard-component/admin-dashboard-component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'utilisateurs',
        loadComponent: () => import('./features/admin/users-management-component/users-management-component').then((m) => m.UsersManagementComponent),
      },
      {
        path: 'organisateurs',
        loadComponent: () => import('./features/admin/organizer-management-component/organizer-management-component').then((m) => m.OrganizersManagementComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/admin/notifications-feed-component/notifications-feed-component').then((m) => m.NotificationsFeedComponent),
      },
      {
        path: 'parametres',
        loadComponent: () => import('./features/admin/plateform-settings-component/plateform-settings-component').then((m) => m.PlatformSettingsComponent),
      },
    ],
  },

  // ───────────── PAGE INTROUVABLE ─────────────
  {
    path: '**',
    loadComponent: () => import('./features/public/not-found-component/not-found-component').then((m) => m.NotFoundComponent),
  },
];
