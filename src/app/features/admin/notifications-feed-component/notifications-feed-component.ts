import { Component, computed, OnInit, signal } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/ui/icon-component/icon-component';
import { AdminActivityLogService } from '../../../core/services/admin-adctivity-log.service';
import { AdminActivityLog } from '../../../core/models';


type FiltreType = 'all' | 'new_event' | 'new_organizer' | 'securite';

const ICONE_PAR_TYPE: Record<string, IconName> = {
  new_event: 'calendar',
  new_organizer: 'wallet',
  account_suspended: 'x',
  account_reactivated: 'check-circle-2',
};

@Component({
  imports: [IconComponent],
  standalone:true,
  selector: 'app-notifications-feed-component',
  styleUrl: './notifications-feed-component.css',
  templateUrl: './notifications-feed-component.html',
})
export class NotificationsFeedComponent implements OnInit {
  loading = signal(true);
  entrees = signal<AdminActivityLog[]>([]);
  filtre = signal<FiltreType>('all');

  // Le statut "lu" reste en mémoire pour cette session (pas de champ isRead
  // sur le modèle pour l'instant, pour ne pas complexifier le mock-data existant).
  idsLus = signal<Set<string>>(new Set());

  constructor(private adminActivityLogService: AdminActivityLogService) {}

  ngOnInit() {
    this.adminActivityLogService.getAll().subscribe((entrees) => {
      this.entrees.set(entrees ?? []);
      this.loading.set(false);
    });
  }

  entreesFiltrees = computed(() => {
    const f = this.filtre();
    return this.entrees()
      .filter((e) => {
        if (f === 'all') return true;
        if (f === 'securite') return e.type === 'account_suspended' || e.type === 'account_reactivated';
        return e.type === f;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  nonLues = computed(() => this.entreesFiltrees().filter((e) => !this.idsLus().has(e.id)));

  groupesParJour = computed(() => {
    const maintenant = new Date();
    const debutAujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const debutHier = new Date(debutAujourdhui);
    debutHier.setDate(debutHier.getDate() - 1);
    const debutSemaine = new Date(debutAujourdhui);
    debutSemaine.setDate(debutSemaine.getDate() - 7);

    const groupes: { libelle: string; entrees: AdminActivityLog[] }[] = [
      { libelle: "Aujourd'hui", entrees: [] },
      { libelle: 'Hier', entrees: [] },
      { libelle: 'Cette semaine', entrees: [] },
      { libelle: 'Plus ancien', entrees: [] },
    ];

    this.entreesFiltrees().forEach((entree) => {
      const date = new Date(entree.createdAt);
      if (date >= debutAujourdhui) groupes[0].entrees.push(entree);
      else if (date >= debutHier) groupes[1].entrees.push(entree);
      else if (date >= debutSemaine) groupes[2].entrees.push(entree);
      else groupes[3].entrees.push(entree);
    });

    return groupes.filter((g) => g.entrees.length > 0);
  });

  icone(type: string): IconName {
    return ICONE_PAR_TYPE[type] ?? 'bell';
  }

  formaterHeure(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateISO));
  }

  marquerCommeLu(id: string) {
    this.idsLus.update((s) => new Set(s).add(id));
  }

  toutMarquerCommeLu() {
    this.idsLus.update((s) => {
      const nouveau = new Set(s);
      this.entreesFiltrees().forEach((e) => nouveau.add(e.id));
      return nouveau;
    });
  }
}
