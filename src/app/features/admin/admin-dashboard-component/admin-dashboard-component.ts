import { Component, computed, signal } from '@angular/core';
import { AdminDataStore } from '../../../core/state/admin-data.store';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { EvolutionChartComponent, PointBrut, SerieGraphique } from '../../../shared/ui/evolution-chart-component/evolution-chart-component';
import { commissionDe as commissionDeTransaction } from '../../../core/models/transaction.model';

type Indicateur = 'utilisateurs' | 'organisateurs' | 'evenements' | 'commissions';

@Component({
  imports: [IconComponent, EvolutionChartComponent],
  standalone: true,
  selector: 'app-admin-dashboard-component',
  styleUrl: './admin-dashboard-component.css',
  templateUrl: './admin-dashboard-component.html',
})
export class AdminDashboardComponent {
  indicateurActif = signal<Indicateur>('commissions');

  constructor(public adminStore: AdminDataStore) {}

  // ── Indicateurs du mois en cours (calculés, plus de "+18%" écrit en dur) ──

  private moisCourant(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private estCeMois(date?: string): boolean {
    return !!date && date.startsWith(this.moisCourant());
  }

  // Ce que rapporte une transaction à SamaPass. Le chiffre vient de Django : chaque vente de
  // billet est comptée au taux figé le jour de l'achat, une publicité à 100 % de son montant.
  private commissionDe(t: any): number {
    return commissionDeTransaction(t);
  }

  nombreOrganisateursActifs = computed(() => this.adminStore.organizers().filter((o: any) => o.status === 'active').length);

  nouveauxUtilisateursCeMois = computed(
    () => this.adminStore.users().filter((u: any) => this.estCeMois(u.createdAt)).length
  );

  nouveauxOrganisateursCeMois = computed(
    () => this.adminStore.organizers().filter((o: any) => this.estCeMois(o.createdAt)).length
  );

  commissionCeMois = computed(() =>
    Math.round(
      this.adminStore
        .transactions()
        .filter((t: any) => t.status === 'success' && this.estCeMois(t.createdAt))
        .reduce((somme: number, t: any) => somme + this.commissionDe(t), 0)
    )
  );

  // ── Graphique de l'indicateur sélectionné ──

  titreGraphique = computed(() => {
    const titres: Record<Indicateur, string> = {
      utilisateurs: 'Évolution des utilisateurs inscrits',
      organisateurs: 'Évolution des organisateurs',
      evenements: 'Évolution des événements créés',
      commissions: 'Évolution des commissions SamaPass',
    };
    return titres[this.indicateurActif()];
  });

  sousTitreGraphique = computed(() => {
    const textes: Record<Indicateur, string> = {
      utilisateurs: 'Nombre cumulé de comptes utilisateurs créés au fil du temps',
      organisateurs: 'Nombre cumulé de comptes organisateurs créés au fil du temps',
      evenements: "Nombre cumulé d'événements créés sur la plateforme",
      commissions: "Commission cumulée : commission de chaque vente de billet (au taux du jour de l'achat) + publicités sponsorisées",
    };
    return textes[this.indicateurActif()];
  });

  resumeIndicateur = computed(() => {
    switch (this.indicateurActif()) {
      case 'utilisateurs':
        return `Total : ${this.adminStore.nombreUtilisateurs().toLocaleString('fr-FR')} utilisateur(s)`;
      case 'organisateurs':
        return `Total : ${this.adminStore.nombreOrganisateurs().toLocaleString('fr-FR')} organisateur(s)`;
      case 'evenements':
        return `Total : ${this.adminStore.events().length.toLocaleString('fr-FR')} événement(s) créé(s)`;
      case 'commissions':
        return `Total : ${this.adminStore.commissionTotale().toLocaleString('fr-FR')} FCFA`;
    }
  });

  private pointsUnitaires(elements: any[]): PointBrut[] {
    return elements.filter((e) => !!e.createdAt).map((e) => ({ date: e.createdAt as string, valeur: 1 }));
  }

  seriesGraphique = computed<SerieGraphique[]>(() => {
    const couleur = '#0042D8';
    switch (this.indicateurActif()) {
      case 'utilisateurs':
        return [{ nom: 'Utilisateurs inscrits', couleur, unite: 'utilisateur(s)', points: this.pointsUnitaires(this.adminStore.users()) }];
      case 'organisateurs':
        return [{ nom: 'Organisateurs', couleur, unite: 'organisateur(s)', points: this.pointsUnitaires(this.adminStore.organizers()) }];
      case 'evenements':
        return [{ nom: 'Événements créés', couleur, unite: 'événement(s)', points: this.pointsUnitaires(this.adminStore.events()) }];
      case 'commissions':
        return [
          {
            nom: 'Commissions perçues',
            couleur,
            unite: 'FCFA',
            points: this.adminStore
              .transactions()
              .filter((t: any) => t.status === 'success' && !!t.createdAt)
              .map((t: any) => ({ date: t.createdAt as string, valeur: this.commissionDe(t) })),
          },
        ];
    }
  });
}
