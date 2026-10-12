import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthStore } from '../state/auth.store';
import { environment } from '../../../environments';

let refreshEnCours = false;
const refreshTermine$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const http = inject(HttpClient);

  const token = authStore.accessToken();
  const requete = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(requete).pipe(
    catchError((erreur: HttpErrorResponse) => {
      if (erreur.status !== 401 || !authStore.refreshToken()) {
        return throwError(() => erreur);
      }

      if (refreshEnCours) {
        return refreshTermine$.pipe(
          filter((nouveauToken): nouveauToken is string => nouveauToken !== null),
          take(1),
          switchMap((nouveauToken) => {
            const requeteRenouvelee = req.clone({ setHeaders: { Authorization: `Bearer ${nouveauToken}` } });
            return next(requeteRenouvelee);
          })
        );
      }

      refreshEnCours = true;

      return http
        .post<{ access: string }>(`${environment.apiUrl}/api/auth/token/refresh/`, {
          refresh: authStore.refreshToken(),
        })
        .pipe(
          switchMap((reponse) => {
            refreshEnCours = false;
            authStore.mettreAJourAccessToken(reponse.access);
            refreshTermine$.next(reponse.access);

            const requeteRenouvelee = req.clone({ setHeaders: { Authorization: `Bearer ${reponse.access}` } });
            return next(requeteRenouvelee);
          }),
          catchError((erreurRefresh) => {
            refreshEnCours = false;
            authStore.logout();
            return throwError(() => erreurRefresh);
          })
        );
    })
  );
};
