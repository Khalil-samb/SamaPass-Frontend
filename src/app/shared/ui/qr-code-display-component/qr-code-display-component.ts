import { Component, Input } from '@angular/core';

@Component({
  imports: [],
  standalone:true,
  selector: 'app-qr-code-display-component',
  styleUrl: './qr-code-display-component.css',
  templateUrl: './qr-code-display-component.html',
})
export class QrCodeDisplayComponent {
  //le contenu à encoder dans  le QR Code
  @Input({ required:true }) value!: string;
  @Input() size =220;

  // On utilise ici un service en ligne gratuit pour générer l'image du QR Code
  // à partir du texte, sans avoir besoin d'installer une librairie tout de suite.
  //
  // ⚠️ À changer plus tard : pour une vraie mise en production, il vaut mieux
  // générer le QR Code directement dans le navigateur (librairie type
  // "qrcode" sur npm), pour ne pas dépendre d'un site externe. Pour l'instant,
  // en phase de maquette avec des données fictives, ça suffit largement.
  get urlDuQrCode(): string {
    const texteEncode = encodeURIComponent(this.value);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${this.size}x${this.size}&data=${texteEncode}`;
  }


}
