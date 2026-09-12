import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole } from '../models/user.model';

const STORAGE_KEY = 'samapass_current_user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  // L'utilisateur actuellement connu sur cet appareil (null = personne identifié)
  private _currentUser = signal<User | null>(this.loadFromStorage());

  currentUser = this._currentUser.asReadonly();

  // true dès que le téléphone a été vérifié par OTP
  isIdentified = computed(() => this._currentUser()?.phoneVerified === true);

  role = computed<UserRole | null>(() => this._currentUser()?.role ?? null);

  // Appelé une fois l'OTP validé avec succès, ou pour la connexion organisateur/admin
  setIdentifiedUser(user: User) {
    this._currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  logout() {
    this._currentUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadFromStorage(): User | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
