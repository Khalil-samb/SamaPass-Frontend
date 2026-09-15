import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

import { SelectedEventStore } from '../../core/state/selected-event.store';
import { IconComponent, IconName } from '../../shared/ui/icon-component/icon-component';
import { BadgeStatusComponent } from '../../shared/ui/badge-status-component/badge-status-component';


interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  badge?: string;
  isLive?: boolean;
}

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, BadgeStatusComponent],
  standalone: true,
  selector: 'app-organizer-layout-component',
  styleUrl: './organizer-layout-component.css',
  templateUrl: './organizer-layout-component.html',
})
export class OrganizerLayoutComponent implements OnInit {
  menuOuvert = signal(false);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/organisateur', icon: 'bar-chart-3' },
    { label: 'Mes événements', path: '/organisateur/evenements', icon: 'calendar' },
    { label: 'Ventes & Billets', path: '/organisateur/ventes', icon: 'ticket' },
    { label: 'Scanner de contrôle', path: '/organisateur/scanner', icon: 'qr-code' },
    { label: 'Campagnes & Pubs', path: '/organisateur/campagnes', icon: 'trending-up' },
    { label: 'Reversements Wave/OM', path: '/organisateur/reversements', icon: 'wallet' },
  ];

  initiales() {
    const nom = this.eventStore.organizer()?.organizationName ?? '';
    return nom.slice(0, 2).toUpperCase();
  }

  constructor(public eventStore: SelectedEventStore) {}

  ngOnInit() {
    this.eventStore.charger();
  }

  choisir(eventId: string) {
    this.eventStore.selectionner(eventId);
    this.menuOuvert.set(false);
  }
}
