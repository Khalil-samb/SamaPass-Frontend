import { computed, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

const CLE_UTILISATEUR = 'samapass_utilisateur';
const CLE_ACCESS = 'samapass_access_token';
const CLE_REFRESH = 'samapass_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  // Reprend l'utilisateur et les jetons déjà stockés (si la personne
  // avait déjà une session avant de recharger la page).
  currentUser = signal<User | null>(this.lireDepuisStockage<User>(CLE_UTILISATEUR));
  accessToken = signal<string | null>(localStorage.getItem(CLE_ACCESS));
  refreshToken = signal<string | null>(localStorage.getItem(CLE_REFRESH));
  role = computed(() => this.currentUser()?.role ?? null);

  isIdentified(): boolean {
    return this.currentUser() !== null;
  }

  // Appelée après l'OTP, la connexion organisateur ou admin : garde à la
  // fois l'utilisateur ET ses jetons, dans le même geste — on ne veut
  // jamais avoir l'un sans l'autre (un utilisateur "connecté" sans jeton
  // valide ne pourrait plus rien faire).
  setIdentifiedUser(utilisateur: User, access: string = this.accessToken() ?? '', refresh: string = this.refreshToken() ?? '') {
    this.currentUser.set(utilisateur);
    this.accessToken.set(access);
    this.refreshToken.set(refresh);

    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
    if (access) localStorage.setItem(CLE_ACCESS, access);
    if (refresh) localStorage.setItem(CLE_REFRESH, refresh);
  }

  // Différente de setIdentifiedUser : utilisée quand on modifie juste le
  // profil (ex. ProfileComponent) — on ne touche jamais aux jetons ici,
  // la personne reste connectée avec les mêmes.
  mettreAJourUtilisateur(utilisateur: User) {
    this.currentUser.set(utilisateur);
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
  }

  // Utilisée uniquement par l'intercepteur, quand un jeton expiré vient
  // d'être renouvelé — on ne veut PAS redemander l'utilisateur complet
  // à cette occasion, juste remplacer le jeton d'accès.
  mettreAJourAccessToken(access: string) {
    this.accessToken.set(access);
    localStorage.setItem(CLE_ACCESS, access);
  }

  logout() {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.refreshToken.set(null);

    localStorage.removeItem(CLE_UTILISATEUR);
    localStorage.removeItem(CLE_ACCESS);
    localStorage.removeItem(CLE_REFRESH);
  }

  private lireDepuisStockage<T>(cle: string): T | null {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : null;
  }
}
