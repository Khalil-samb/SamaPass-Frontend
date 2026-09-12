import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { IconComponent } from '../../shared/ui/icon-component/icon-component';
import { AuthStore } from '../../core/state/auth.store';

@Component({
  imports: [RouterOutlet, RouterLink, FormsModule, IconComponent],
  standalone:true,
  selector: 'app-public-layout-component',
  styleUrl: './public-layout-component.css',
  templateUrl: './public-layout-component.html',
})
export class PublicLayoutComponent {
  rechercheRapide = '';

  constructor(
    private router: Router,
    public authStore: AuthStore
) {}

  lancerRechercheRapide() {
    if (!this.rechercheRapide.trim()) return;
    this.router.navigate(['/evenements'], { queryParams: { q: this.rechercheRapide } });
  }

  seDeconnecter() {
    this.authStore.logout();
    this.router.navigateByUrl('/bienvenue');
  }
}
