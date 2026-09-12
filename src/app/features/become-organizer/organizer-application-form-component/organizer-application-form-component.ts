import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { FormsModule } from '@angular/forms';
import { Category, Organizer, OrganizerPaymentMethod } from '../../../core/models';
import { CategoriesService } from '../../../core/services/categories.service';
import { OrganizersService } from '../../../core/services/organizers.service';
import { AuthStore } from '../../../core/state/auth.store';






@Component({
  imports: [RouterLink, FormsModule, IconComponent],
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

  // ── Étape 2 ──
  nomLegal = signal('');
  numeroRegistre = signal('');
  categoryId = signal('');
  description = signal('');
  logoFile: File | null = null;
  nomFichierLogo = signal<string | null>(null);
  modePaiement = signal<OrganizerPaymentMethod>('wave');
  numeroMarchand = signal('');
  titulaireCompte = signal('');

  enregistrementEnCours = signal(false);
  erreurValidation = signal<string | null>(null);


  // ── Ponts getter/setter pour brancher [(ngModel)] directement sur les signals ──
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

  motsDePasseCorrespondant = computed(() => this.motDePasse() === this.confirmationMotDePasse());

  forceMotDePasse = computed(() => {
    const mdp = this.motDePasse();
    if (mdp.length < 8) return { label: 'Faible', pourcentage: 25, couleur: 'bg-red-500' };
    if (mdp.length < 12 || !/[0-9]/.test(mdp) || !/[A-Z]/.test(mdp)) {
      return { label: 'Moyen', pourcentage: 60, couleur: 'bg-orange-400' };
    }
    return { label: 'Robuste', pourcentage: 100, couleur: 'bg-green-500' };
  });

  etape1Valide = computed(() =>
    this.email().includes('@') &&
    this.motDePasse().length >= 8 &&
    this.motsDePasseCorrespondant()
  );

  etape2Valide = computed(() =>
    this.nomLegal().trim().length >= 2 &&
    this.categoryId() !== '' &&
    this.numeroMarchand().trim().length >= 9 &&
    this.titulaireCompte().trim().length >= 2
  );

  peutValider = computed(() => this.etape1Valide() && this.etape2Valide());

  constructor(
    private router: Router,
    private categoriesService: CategoriesService,
    private organizersService: OrganizersService,
    private authStore: AuthStore
  ) {}

  ngOnInit() {
    this.categoriesService.getAll().subscribe((categories) => this.categories.set(categories ?? []));
  }

  onLogoSelectionne(event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (fichier) {
      this.logoFile = fichier;
      this.nomFichierLogo.set(fichier.name);
    }
  }

  validerEtCreerCompte() {
    if (!this.peutValider()) return;

    const utilisateur = this.authStore.currentUser();
    if (!utilisateur) {
      this.erreurValidation.set("Vous devez d'abord vous identifier avant de créer un compte organisateur.");
      return;
    }

    this.enregistrementEnCours.set(true);
    this.erreurValidation.set(null);

    // Pas de vrai backend pour l'instant : on simule un court traitement,
    // comme le ferait un vrai enregistrement en base de données.
    setTimeout(() => {
      // 1. On transforme le compte utilisateur existant en compte organisateur.
      //    ⚠️ Le mot de passe est stocké tel quel ici : le vrai hachage sécurisé
      //    (bcrypt ou équivalent) devra être fait côté backend, jamais côté front.
      this.authStore.setIdentifiedUser({
        ...utilisateur,
        role: 'organizer',
        email: this.email(),
        passwordHash: this.motDePasse(),
      });

      // 2. On crée le profil Organizer, relié à ce compte.
      //    Le logo reste local à la session (URL temporaire du navigateur) tant
      //    qu'il n'y a pas de vrai stockage de fichiers côté serveur.
      const nouvelOrganizer: Organizer = {
        id: `org-${Date.now()}`,
        userId: utilisateur.id,
        organizationName: this.nomLegal(),
        registrationNumber: this.numeroRegistre() || undefined,
        categoryId: this.categoryId(),
        description: this.description() || undefined,
        logoUrl: this.logoFile ? URL.createObjectURL(this.logoFile) : undefined,
        paymentMethod: this.modePaiement(),
        mobileMoneyAccountNumber: this.numeroMarchand(),
        mobileMoneyAccountHolder: this.titulaireCompte(),
        receoitAlertesVente: this.recoitAlertes(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.organizersService.ajouterOrganizer(nouvelOrganizer);

      this.enregistrementEnCours.set(false);
      this.router.navigateByUrl('/devenir-organisateur/bienvenue');
    }, 900);
  }
}
