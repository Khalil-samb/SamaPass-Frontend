import { Component, computed, effect, signal, untracked } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';

import { SponsoredAd } from '../../../core/models';
import { Video } from '../../../core/models/video.model';
import { SponsoredAdsService } from '../../../core/services/sponsored-ads.service';
import { VideosService } from '../../../core/services/videos.service';
import { SelectedEventStore } from '../../../core/state/selected-event.store';

// Mêmes limites que le serveur (videos/rules.py) : on prévient avant d'envoyer 300 Mo pour rien.
const TAILLE_MAX_OCTETS = 300 * 1024 * 1024;
const PRIX_BOOST = 15000;

@Component({
  standalone: true,
  imports: [],
  selector: 'app-sponsored-ad-component',
  styleUrl: './sponsored-ad-component.css',
  templateUrl: './sponsored-ad-component.html',
  // Si on lâche un fichier à côté de la zone, le navigateur ouvrirait la vidéo et quitterait la page : on l'empêche.
  host: {
    '(window:dragover)': 'bloquerNavigateur($event)',
    '(window:drop)': 'bloquerNavigateur($event)',
  },
})
export class SponsoredAdComponent {
  prixBoost = PRIX_BOOST;

  // ── Boost ──
  campagneActive = signal<SponsoredAd | null>(null);
  confirmationBoost = signal(false);
  achatEnCours = signal(false);
  erreurBoost = signal<string | null>(null);

  // ── Vidéos ──
  videos = signal<Video[]>([]);
  chargementVideos = signal(false);
  erreurVideos = signal<string | null>(null);

  fichier = signal<File | null>(null);
  titre = signal('');
  envoiEnCours = signal(false);
  progression = signal(0);
  erreurEnvoi = signal<string | null>(null);
  succesEnvoi = signal(false);

  videoASupprimer = signal<string | null>(null);

  // ── Glisser-déposer & aperçu ──
  survol = signal(false);
  apercuUrl = signal<string | null>(null);
  dureeApercu = signal<string | null>(null);
  private envoiEnCoursAbonnement: Subscription | null = null;

  // ── Chiffres du haut de page ──
  totalVues = computed(() => this.videos().reduce((somme, v) => somme + v.viewsCount, 0));
  totalJaime = computed(() => this.videos().reduce((somme, v) => somme + v.likesCount, 0));

  constructor(
    public eventStore: SelectedEventStore,
    private sponsoredAdsService: SponsoredAdsService,
    private videosService: VideosService
  ) {
    // Recharge tout quand l'organisateur change d'événement dans la liste du haut.
    effect(() => {
      const eventId = this.eventStore.selectedEventId();
      untracked(() => this.chargerPourEvenement(eventId));
    });
  }

  // ═════════════ Règles d'affichage ═════════════

  // Même règle que le serveur : seul un événement publié (ou complet) et pas encore terminé reçoit des vidéos ou un boost.
  evenementOuvert(): boolean {
    const ev = this.eventStore.selectedEvent();
    if (!ev) return false;
    return (ev.status === 'published' || ev.status === 'sold_out') && new Date(ev.endDate).getTime() > Date.now();
  }

  messageEvenementFerme(): string {
    const ev = this.eventStore.selectedEvent();
    if (!ev) return '';
    if (ev.status === 'draft') return "Publiez d'abord cet événement : les vidéos et le boost ne sont disponibles que pour un événement publié.";
    if (ev.status === 'finished' || new Date(ev.endDate).getTime() <= Date.now()) return 'Cet événement est terminé : ses vidéos ont été retirées et le boost a pris fin.';
    if (ev.status === 'cancelled') return 'Cet événement est annulé.';
    return '';
  }

  labelMoyenPaiement(): string {
    const methode = this.eventStore.organizer()?.paymentMethod;
    return methode === 'orange_money' ? 'Orange Money' : 'Wave';
  }

  formaterDate(dateISO: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateISO));
  }

  formaterTaille(octets?: number): string {
    if (!octets) return '';
    return octets >= 1024 * 1024 ? `${(octets / (1024 * 1024)).toFixed(1)} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`;
  }

  // ═════════════ Chargement ═════════════

  private chargerPourEvenement(eventId: string | null) {
    this.campagneActive.set(null);
    this.confirmationBoost.set(false);
    this.erreurBoost.set(null);
    this.videos.set([]);
    this.erreurVideos.set(null);
    // Un envoi en cours concerne l'ancien événement : on l'abandonne pour ne pas mélanger les listes.
    this.envoiEnCoursAbonnement?.unsubscribe();
    this.envoiEnCoursAbonnement = null;
    this.envoiEnCours.set(false);
    this.annulerChoix();
    this.succesEnvoi.set(false);
    this.videoASupprimer.set(null);
    if (!eventId) return;

    this.sponsoredAdsService.getCampagneActive(eventId).subscribe({
      next: (pub) => this.campagneActive.set(pub),
      error: () => this.campagneActive.set(null),      // 404 = pas de campagne : cas normal
    });
    this.chargerVideos(eventId);
  }

  private chargerVideos(eventId: string) {
    this.chargementVideos.set(true);
    this.videosService.mesVideos(eventId).subscribe({
      next: (liste) => {
        // Si l'organisateur a changé d'événement entre-temps, on ignore cette réponse tardive.
        if (this.eventStore.selectedEventId() === eventId) this.videos.set(liste);
        this.chargementVideos.set(false);
      },
      error: () => {
        this.erreurVideos.set('Impossible de charger les vidéos. Vérifiez votre connexion et réessayez.');
        this.chargementVideos.set(false);
      },
    });
  }

  // ═════════════ Boost (15 000 FCFA, jusqu'à la fin de l'événement) ═════════════

  demanderBoost() {
    this.erreurBoost.set(null);
    this.confirmationBoost.set(true);
  }

  annulerBoost() {
    this.confirmationBoost.set(false);
  }

  async confirmerBoost() {
    const eventId = this.eventStore.selectedEventId();
    if (!eventId || this.achatEnCours()) return;

    this.achatEnCours.set(true);
    this.erreurBoost.set(null);
    try {
      const pub = await firstValueFrom(this.sponsoredAdsService.acheterCampagne(eventId));
      this.campagneActive.set(pub);
      this.confirmationBoost.set(false);
    } catch (erreur: any) {
      this.erreurBoost.set(erreur?.error?.erreur ?? "Le paiement n'a pas abouti. Réessayez dans un instant.");
    } finally {
      this.achatEnCours.set(false);
    }
  }

  // ═════════════ Envoi d'une vidéo ═════════════

  choisirFichier(evenement: Event) {
    const champ = evenement.target as HTMLInputElement;
    this.accepterFichier(champ.files?.[0] ?? null);
    if (!this.fichier()) champ.value = '';
  }

  // ── Glisser-déposer ──
  bloquerNavigateur(e: Event) {
    e.preventDefault();
  }

  survolerZone(e: DragEvent) {
    e.preventDefault();
    if (!this.envoiEnCours()) this.survol.set(true);
  }

  quitterZone(e: DragEvent) {
    e.preventDefault();
    this.survol.set(false);
  }

  deposer(e: DragEvent) {
    e.preventDefault();
    this.survol.set(false);
    if (this.envoiEnCours()) return;
    const fichiers = e.dataTransfer?.files;
    if (fichiers && fichiers.length > 1) {
      this.erreurEnvoi.set('Déposez une seule vidéo à la fois.');
      return;
    }
    this.accepterFichier(fichiers?.[0] ?? null);
  }

  // Même contrôle pour « Parcourir » et pour le glisser-déposer.
  private accepterFichier(choisi: File | null) {
    this.erreurEnvoi.set(null);
    this.succesEnvoi.set(false);
    this.libererApercu();

    if (!choisi) {
      this.fichier.set(null);
      return;
    }
    const nom = choisi.name.toLowerCase();
    if (!nom.endsWith('.mp4') && !nom.endsWith('.webm')) {
      this.erreurEnvoi.set('Format non accepté : choisissez une vidéo MP4 ou WebM.');
      this.fichier.set(null);
      return;
    }
    if (choisi.size > TAILLE_MAX_OCTETS) {
      this.erreurEnvoi.set(`Vidéo trop lourde (${this.formaterTaille(choisi.size)}). Maximum : 300 Mo.`);
      this.fichier.set(null);
      return;
    }
    this.fichier.set(choisi);

    // Titre proposé à partir du nom du fichier (l'organisateur peut le changer).
    if (!this.titre().trim()) this.titre.set(this.titreDepuisNom(choisi.name));

    // Aperçu local : l'organisateur vérifie que c'est la bonne vidéo avant de l'envoyer.
    // Si le navigateur ne sait pas (ou échoue), on envoie quand même : l'aperçu n'est qu'un confort.
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') this.apercuUrl.set(URL.createObjectURL(choisi));
    } catch {
      this.apercuUrl.set(null);
    }
  }

  titreDepuisNom(nomFichier: string): string {
    const sansExtension = nomFichier.replace(/\.(mp4|webm)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sansExtension) return '';
    return (sansExtension.charAt(0).toUpperCase() + sansExtension.slice(1)).slice(0, 120);
  }

  // Appelé quand le navigateur connaît la durée de la vidéo choisie.
  lireDuree(video: HTMLVideoElement) {
    const secondes = Math.round(video.duration);
    if (!isFinite(secondes) || secondes <= 0) return;
    const m = Math.floor(secondes / 60);
    const s = secondes % 60;
    this.dureeApercu.set(`${m}:${s.toString().padStart(2, '0')}`);
  }

  private libererApercu() {
    const url = this.apercuUrl();
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
    this.apercuUrl.set(null);
    this.dureeApercu.set(null);
  }

  annulerChoix() {
    this.libererApercu();
    this.fichier.set(null);
    this.titre.set('');
    this.progression.set(0);
    this.erreurEnvoi.set(null);
  }

  envoyer() {
    const eventId = this.eventStore.selectedEventId();
    const fichier = this.fichier();
    if (!eventId || !fichier || this.envoiEnCours()) return;

    this.envoiEnCours.set(true);
    this.progression.set(0);
    this.erreurEnvoi.set(null);
    this.succesEnvoi.set(false);

    this.envoiEnCoursAbonnement = this.videosService.ajouter(eventId, this.titre().trim(), fichier).subscribe({
      next: (e) => {
        if (e.type === HttpEventType.UploadProgress && e.total) {
          this.progression.set(Math.round((100 * e.loaded) / e.total));
        } else if (e.type === HttpEventType.Response && e.body) {
          this.videos.update((liste) => [e.body as Video, ...liste]);
          this.envoiEnCours.set(false);
          this.succesEnvoi.set(true);
          this.annulerChoix();
        }
      },
      error: (erreur) => {
        this.envoiEnCours.set(false);
        this.erreurEnvoi.set(erreur?.error?.erreur ?? "L'envoi a échoué. Vérifiez votre connexion et réessayez.");
      },
    });
  }

  // Interrompt l'envoi en cours (la requête est abandonnée, rien n'est enregistré côté serveur).
  annulerEnvoi() {
    this.envoiEnCoursAbonnement?.unsubscribe();
    this.envoiEnCoursAbonnement = null;
    this.envoiEnCours.set(false);
    this.progression.set(0);
    this.erreurEnvoi.set("Envoi annulé. Votre vidéo n'a pas été publiée.");
  }

  // ═════════════ Suppression ═════════════

  demanderSuppression(videoId: string) {
    this.videoASupprimer.set(videoId);
  }

  annulerSuppression() {
    this.videoASupprimer.set(null);
  }

  confirmerSuppression(videoId: string) {
    this.videosService.supprimer(videoId).subscribe({
      next: () => {
        this.videos.update((liste) => liste.filter((v) => v.id !== videoId));
        this.videoASupprimer.set(null);
      },
      error: () => {
        this.erreurVideos.set('La suppression a échoué. Réessayez.');
        this.videoASupprimer.set(null);
      },
    });
  }
}
