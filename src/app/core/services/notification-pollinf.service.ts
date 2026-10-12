//Vérifie juste le nombre de non-lues, en boucle légère, tout le temps


// Principe : on interroge SEULEMENT le compteur en continu (toutes les
// 20 secondes). La liste complète n'est chargée qu'au moment où
// l'utilisateur ouvre vraiment le panneau de notifications — jamais en
// arrière-plan sans raison.
//
// Bonus anti-gaspillage : document.hidden permet de suspendre le polling
// quand l'utilisateur a changé d'onglet — inutile d'interroger le serveur
// pour une page que personne ne regarde.

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NotificationPollingService {
  nombreNonLues = signal(0);
  private abonnement: Subscription | null = null;

  constructor(private http: HttpClient) {}

  demarrer() {
    // toutes les 20 secondes, mais seulement si l'onglet est visible
    this.abonnement = interval(20000)
      .pipe(
        filter(() => !document.hidden),
        switchMap(() => this.http.get<{ non_lues: number }>('/api/engagement/notifications/count/'))
      )
      .subscribe((reponse) => this.nombreNonLues.set(reponse.non_lues));
  }

  arreter() {
    this.abonnement?.unsubscribe();
  }
}
