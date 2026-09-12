import { Routes } from '@angular/router';


// LAYOUTS
import { PublicLayoutComponent } from './layout/public-layout-component/public-layout-component';
import { OrganizerLayoutComponent } from './layout/organizer-layout-component/organizer-layout-component';
import { AdminLayoutComponent } from './layout/admin-layout-component/admin-layout-component';

// PORTE D'ENTRÉE (téléphone + OTP)

import { PhoneEntryComponent } from './features/entry/phone-entry-component/phone-entry-component';

// ───────────────────────────────────────────────────────────
// ESPACE PUBLIC
// ───────────────────────────────────────────────────────────
import { HomeComponent } from './features/public/home-component/home-component';
import { SearchResultsComponent } from './features/public/search-results-component/search-results-component';
import { EventDetailComponent } from './features/public/event-detail-component/event-detail-component';
import { TicketConfirmationComponent } from './features/public/ticket-confimation-component/ticket-confimation-component';
import { NotFoundComponent } from './features/public/not-found-component/not-found-component';

// ───────────────────────────────────────────────────────────
// UTILISATEUR IDENTIFIÉ
// ───────────────────────────────────────────────────────────
import { ProfileComponent } from './features/user/profile-component/profile-component';
import { MyTicketsComponent } from './features/user/my-tickets-component/my-tickets-component';
import { FavoritesComponent } from './features/user/favorites-component/favorites-component';
import { NotificationsListComponent } from './features/user/notifications-list-component/notifications-list-component';

// ───────────────────────────────────────────────────────────
// DEVENIR ORGANISATEUR
// ───────────────────────────────────────────────────────────
import { BecomeOrganizerLandingComponent } from './features/become-organizer/become-organizer-landing-component/become-organizer-landing-component';
import { OrganizerApplicationFormComponent } from './features/become-organizer/organizer-application-form-component/organizer-application-form-component';
import { OrganizerWelcomeComponent } from './features/become-organizer/organizer-welcome-component/organizer-welcome-component'

// ───────────────────────────────────────────────────────────
// CONNEXIONS ORGANISATEUR / ADMIN
// ───────────────────────────────────────────────────────────
import { OrganizerLoginComponent } from './features/auth/organizer-login-component/organizer-login-component';
import { AdminLoginComponent } from './features/auth/admin-login-component/admin-login-component';

// ───────────────────────────────────────────────────────────
// ESPACE ORGANISATEUR
// ───────────────────────────────────────────────────────────
import { OrganizerDashboardComponent } from './features/organizer/organizer-dashboard-component/organizer-dashboard-component';
import { MyEventsListComponent } from './features/organizer/my-events-list-component/my-events-list-component';
import { EventWizardComponent } from './features/organizer/event-wizard-component/event-wizard-component';
import { EventPublishedComponent } from './features/organizer/event-published-component/event-published-component';
import { EventSalesDetailComponent } from './features/organizer/event-sales-detail-component/event-sales-detail-component';
import { EventSupervisionComponent } from './features/organizer/event-supervision-component/event-supervision-component';
import { TicketScannerComponent } from './features/organizer/ticket-scanner-component/ticket-scanner-component';
import { SponsoredAdComponent } from './features/organizer/sponsored-ad-component/sponsored-ad-component';
import { OrganizerSettingsComponent } from './features/organizer/organizer-settings-component/organizer-settings-component';

// ───────────────────────────────────────────────────────────
// ESPACE ADMINISTRATEUR
// ───────────────────────────────────────────────────────────
import { AdminDashboardComponent } from './features/admin/admin-dashboard-component/admin-dashboard-component';
import { UsersManagementComponent } from './features/admin/users-management-component/users-management-component';
import { OrganizerManagementComponent } from './features/admin/organizer-management-component/organizer-management-component';
import { NotificationsFeedComponent } from './features/admin/notifications-feed-component/notifications-feed-component';
import { PlateformSettingsComponent } from './features/admin/plateform-settings-component/plateform-settings-component';


export const routes: Routes = [

  // Porte d'entrée — accessible directement, aucune protection pour l'instant
  { path: 'bienvenue', component: PhoneEntryComponent },

  // ───────────── ESPACE PUBLIC + UTILISATEUR ─────────────
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'evenements', component: SearchResultsComponent },
      { path: 'evenements/:id', component: EventDetailComponent },
      { path: 'billet/:ticketId/confirmation', component: TicketConfirmationComponent },


      // Utilisateur identifié
      { path: 'compte/profil', component: ProfileComponent },
      { path: 'compte/mes-billets', component: MyTicketsComponent },
      { path: 'compte/favoris', component: FavoritesComponent },
      { path: 'compte/notifications', component: NotificationsListComponent },


    ],
  },
  // ───────────── DEVENIR ORGANISATEUR — PAS de PublicLayoutComponent ─────────────
  // Ces pages ont leur propre en-tête minimal (logo + "Quitter"), volontairement
  // isolées de la navigation principale du site — c'est un tunnel de conversion,
  // pas une page comme les autres.
  // Devenir organisateur
  { path: 'devenir-organisateur', component: BecomeOrganizerLandingComponent },
  { path: 'devenir-organisateur/inscription', component: OrganizerApplicationFormComponent },
  { path: 'devenir-organisateur/bienvenue', component: OrganizerWelcomeComponent },

  // ───────────── CONNEXIONS ─────────────
  { path: 'organisateur/connexion', component: OrganizerLoginComponent },
  { path: 'admin/connexion', component: AdminLoginComponent },

  // ───────────── ESPACE ORGANISATEUR ─────────────
  {
    path: 'organisateur',
    component: OrganizerLayoutComponent,
    children: [
      { path: '', component: OrganizerDashboardComponent },
      { path: 'evenements', component: MyEventsListComponent },
      { path: 'evenements/nouveau', component: EventWizardComponent },
      { path: 'evenements/:id/publie', component: EventPublishedComponent },
      { path: 'evenements/:id/ventes', component: EventSalesDetailComponent },
      { path: 'evenements/:id/supervision', component: EventSupervisionComponent },
      { path: 'scanner', component: TicketScannerComponent },
      { path: 'evenements/:id/publicite', component: SponsoredAdComponent },
      { path: 'parametres', component: OrganizerSettingsComponent },
    ],
  },

  // ───────────── ESPACE ADMINISTRATEUR ─────────────
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'utilisateurs', component: UsersManagementComponent },
      { path: 'organisateurs', component: OrganizerManagementComponent },
      { path: 'notifications', component: NotificationsFeedComponent },
      { path: 'parametres', component: PlateformSettingsComponent },
    ],
  },

  // ───────────── PAGE INTROUVABLE ─────────────
  { path: '**', component: NotFoundComponent },
];
