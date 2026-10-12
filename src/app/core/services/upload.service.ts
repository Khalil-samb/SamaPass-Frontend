import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  //  Ne PAS fixer manuellement l'en-tête Content-Type ici : le
  // navigateur le calcule lui-même correctement (avec la "boundary"
  // nécessaire) quand on lui passe un FormData. Le fixer à la main
  // casserait systématiquement l'envoi.
  uploadImage(fichier: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('image', fichier);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/api/events/upload-image/`, formData);
  }
}

