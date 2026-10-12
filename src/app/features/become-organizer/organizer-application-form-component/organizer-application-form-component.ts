import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { UploadService } from '../../../core/services/upload.service';
import { OrganizerProfileService } from '../../../core/services/organizer-profile.service';
import { Category, OrganizerPaymentMethod, User } from '../../../core/models';
import { CategoriesService } from '../../../core/services/categories.service';
import { AuthStore } from '../../../core/state/auth.store';
import { PlatformRateStore } from '../../../core/state/platform-rate.store';
import { environment } from '../../../../environments';

interface ReponseInscriptionOrganizer {
  access: string;
  refresh: string;
  user: User;
  organizerId: string;
}

// Un critère de robustesse du mot de passe, affiché un par un à l'écran
// pour GUIDER la personne — plutôt qu'un score opaque sans explication.
export interface CritereMotDePasse {
  label: string;
  valide: boolean;
}

// Format d'email standard (présence d'un @ et d'un point après, sans espace).
//  Ceci vérifie que l'adresse est bien FORMÉE, pas qu'elle appartient à une
// vraie entreprise : Gmail ou Yahoo restent acceptés, ce qui est réaliste
// pour de petites structures organisatrices au Sénégal. Pour interdire
// spécifiquement les adresses grand public (gmail.com, yahoo.fr...), une
// liste noire de domaines serait nécessaire — dites-le-moi si vous voulez
// vraiment cette restriction, plus stricte.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Logo (facultatif) : mêmes limites que la page Paramètres et que le serveur
const FORMATS_LOGO = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_LOGO = 5 * 1024 * 1024;

@Component({
  imports: [RouterLink, FormsModule, IconComponent, RevealDirective],
  selector: 'app-organizer-application-form-component',
  styleUrl: './organizer-application-form-component.css',
  templateUrl: './organizer-application-form-component.html',
})
export class OrganizerApplicationFormComponent implements OnInit {
  categories = signal<Category[]>([]);

  // ── Étape 1 ──
  email = signal('');
  motDePasse = signal('');
  confirmationMotDePasse = signal('');
  recoitAlertes = signal(true);
  motDePasseVisible = signal(false);

  // ── Étape 2 ──
  nomLegal = signal('');
  numeroRegistre = signal('');
  categoryId = signal('');
  description = signal('');
  logoFile: File | null = null;
  nomFichierLogo = signal<string | null>(null);
  apercuLogo = signal<string | null>(null);
  erreurLogo = signal<string | null>(null);
  modePaiement = signal<OrganizerPaymentMethod>('wave');
  numeroMarchand = signal('');
  titulaireCompte = signal('');

  enregistrementEnCours = signal(false);
  erreurValidation = signal<string | null>(null);

  get emailValue() { return this.email(); } set emailValue(v: string) { this.email.set(v); }
  get motDePasseValue() { return this.motDePasse(); } set motDePasseValue(v: string) { this.motDePasse.set(v); }
  get confirmationMotDePasseValue() { return this.confirmationMotDePasse(); } set confirmationMotDePasseValue(v: string) { this.confirmationMotDePasse.set(v); }
  get recoitAlertesValue() { return this.recoitAlertes(); } set recoitAlertesValue(v: boolean) { this.recoitAlertes.set(v); }
  get nomLegalValue() { return this.nomLegal(); } set nomLegalValue(v: string) { this.nomLegal.set(v); }
  get numeroRegistreValue() { return this.numeroRegistre(); } set numeroRegistreValue(v: string) { this.numeroRegistre.set(v); }
  get categoryIdValue() { return this.categoryId(); } set categoryIdValue(v: string) { this.categoryId.set(v); }
  get descriptionValue() { return this.description(); } set descriptionValue(v: string) { this.description.set(v); }
  get numeroMarchandValue() { return this.numeroMarchand(); } set numeroMarchandValue(v: string) { this.numeroMarchand.set(v); }
  get titulaireCompteValue() { return this.titulaireCompte(); } set titulaireCompteValue(v: string) { this.titulaireCompte.set(v); }

  //  Avant : email().includes('@') acceptait littéralement "@" tout seul
  // comme valide. Un vrai format est maintenant exigé.
  emailValide = computed(() => REGEX_EMAIL.test(this.email().trim()));

  // Affiché seulement après que la personne ait commencé à taper quelque
  // chose : pas d'erreur qui s'affiche sur un champ encore vide.
  emailErreur = computed(() => {
    const valeur = this.email().trim();
    if (!valeur) return null;
    return this.emailValide() ? null : 'Format invalide — exemple : contact@votreentreprise.sn';
  });

  motsDePasseCorrespondant = computed(() => this.motDePasse() === this.confirmationMotDePasse());

  //  Chaque critère est vérifié et affiché SÉPARÉMENT côté template :
  // c'est ce qui transforme un score opaque en vrai guide pour la personne
  // (elle voit exactement ce qu'il manque, pas juste "Faible").
  criteresMotDePasse = computed<CritereMotDePasse[]>(() => {
    const mdp = this.motDePasse();
    return [
      { label: 'Au moins 8 caractères', valide: mdp.length >= 8 },
      { label: 'Une majuscule (A-Z)', valide: /[A-Z]/.test(mdp) },
      { label: 'Une minuscule (a-z)', valide: /[a-z]/.test(mdp) },
      { label: 'Un chiffre (0-9)', valide: /[0-9]/.test(mdp) },
      { label: 'Un caractère spécial (!?#$%...)', valide: /[^A-Za-z0-9]/.test(mdp) },
    ];
  });

  nombreCriteresValides = computed(() => this.criteresMotDePasse().filter((c) => c.valide).length);

 
  forceMotDePasse = computed(() => {
    const valides = this.nombreCriteresValides();
    const total = this.criteresMotDePasse().length;

    if (valides <= 2) return { label: 'Faible', barres: 1, couleur: 'bg-red-500', texte: 'text-red-600' };
    if (valides === 3) return { label: 'Moyen', barres: 2, couleur: 'bg-orange-600', texte: 'text-orange-700' };
    if (valides === 4) return { label: 'Bon', barres: 3, couleur: 'bg-amber-400', texte: 'text-amber-600' };
    if (valides === total) return { label: 'Robuste', barres: 4, couleur: 'bg-emerald-500', texte: 'text-emerald-600' };
    return { label: 'Faible', barres: 1, couleur: 'bg-red-500', texte: 'text-red-600' };
  });

  // Exigence RÉELLE pour pouvoir continuer : au moins 4 des 5 critères (pas
  // besoin du caractère spécial pour être accepté, mais fortement conseillé
  // — la barre "Robuste" ne s'affiche que si les 5 sont remplis).
  motDePasseAcceptable = computed(() => this.nombreCriteresValides() >= 4);

  etape1Valide = computed(() =>
    this.emailValide() &&
    this.motDePasseAcceptable() &&
    this.motsDePasseCorrespondant()
  );

  etape2Valide = computed(() =>
    this.nomLegal().trim().length >= 2 &&
    this.categoryId() !== '' &&
    this.numeroMarchand().trim().length >= 9 &&
    this.titulaireCompte().trim().length >= 2
  );

  peutValider = computed(() => this.etape1Valide() && this.etape2Valide());

  // Le taux de commission réglé par l'admin (plus de « 5 % » écrit en dur dans la page)
  tauxCommission = computed(() => this.platformRate.commissionRate());

  constructor(
    private router: Router,
    private categoriesService: CategoriesService,
    private authStore: AuthStore,
    private http: HttpClient,
    private platformRate: PlatformRateStore,
    private uploadService: UploadService,
    private profilService: OrganizerProfileService
  ) {}

  ngOnInit() {
    this.platformRate.charger();
    this.categoriesService.getAll().subscribe((categories) => this.categories.set(categories ?? []));
  }

  // Le logo est FACULTATIF : sans lui, l'inscription fonctionne exactement pareil.
  onLogoSelectionne(event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = ''; // permet de re-choisir le même fichier
    if (!fichier) return;

    if (!FORMATS_LOGO.includes(fichier.type)) {
      this.erreurLogo.set('Format non supporté (JPEG, PNG ou WebP uniquement).');
      return;
    }
    if (fichier.size > TAILLE_MAX_LOGO) {
      this.erreurLogo.set('Image trop volumineuse (5 Mo maximum).');
      return;
    }

    this.erreurLogo.set(null);
    this.logoFile = fichier;
    this.nomFichierLogo.set(fichier.name);
    this.remplacerApercu(fichier);
  }

  retirerLogo() {
    this.logoFile = null;
    this.nomFichierLogo.set(null);
    this.erreurLogo.set(null);
    this.remplacerApercu(null);
  }

  private remplacerApercu(fichier: File | null) {
    const ancien = this.apercuLogo();
    if (ancien) {
      try { URL.revokeObjectURL(ancien); } catch { /* sans importance */ }
    }
    let url: string | null = null;
    if (fichier) {
      try { url = URL.createObjectURL(fichier); } catch { url = null; }
    }
    this.apercuLogo.set(url);
  }

  // Après l'inscription (le jeton est alors en place), on envoie le logo puis on l'enregistre dans le profil.
  // Si cette étape échoue, l'inscription RESTE réussie : le logo pourra être ajouté depuis Paramètres.
  private enregistrerLogoPuisContinuer() {
    const continuer = () => {
      this.enregistrementEnCours.set(false);
      this.router.navigateByUrl('/devenir-organisateur/bienvenue');
    };
    if (!this.logoFile) return continuer();

    this.uploadService.uploadImage(this.logoFile).subscribe({
      next: (reponse) => {
        this.profilService.modifierProfil({ logoUrl: reponse.url }).subscribe({
          next: () => continuer(),
          error: () => continuer(),
        });
      },
      error: () => continuer(),
    });
  }

  //  Réécriture complète : avant, ce composant transformait le compte
  // utilisateur "à la main" (role: 'organizer' collé directement dessus,
  // Date.now() comme id...) et gardait un mot de passe EN CLAIR dans
  // passwordHash. Maintenant, un seul appel à Django, qui hache
  // vraiment le mot de passe et fait la transformation lui-même.
  validerEtCreerCompte() {
    if (!this.peutValider()) return;

    if (!this.authStore.currentUser()) {
      this.erreurValidation.set("Vous devez d'abord vous identifier avant de créer un compte organisateur.");
      return;
    }

    this.enregistrementEnCours.set(true);
    this.erreurValidation.set(null);

    this.http
      .post<ReponseInscriptionOrganizer>(`${environment.apiUrl}/api/auth/organizer/register/`, {
        email: this.email().trim(),
        password: this.motDePasse(),
        organizationName: this.nomLegal(),
        registrationNumber: this.numeroRegistre() || undefined,
        categoryId: this.categoryId(),
        paymentMethod: this.modePaiement(),
        mobileMoneyAccountNumber: this.numeroMarchand(),
        mobileMoneyAccountHolder: this.titulaireCompte(),
        receoitAlertesVente: this.recoitAlertes(),
      })
      .subscribe({
        next: (reponse) => {
          this.authStore.setIdentifiedUser(reponse.user, reponse.access, reponse.refresh);
          this.enregistrerLogoPuisContinuer();
        },
        error: (erreur) => {
          this.enregistrementEnCours.set(false);
          this.erreurValidation.set(erreur.error?.erreur ?? "L'inscription a échoué. Vérifiez vos informations et réessayez.");
        },
      });
  }
}

