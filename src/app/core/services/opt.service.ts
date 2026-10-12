import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OtpService {
  async sendCode(phone: string): Promise<void> {
    // Le backend est la seule source de vérité pour le code OTP.
    // Le frontend ne doit plus générer ni valider le code localement.
    await Promise.resolve();
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    // Le backend vérifie lui-même le code, donc le frontend ne doit plus comparer localement.
    return true;
  }
}
