import { Component, OnInit, WritableSignal, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { CategoriesService } from '../../../core/services/categories.service';
import { CitiesService } from '../../../core/services/cities.service';
import { UploadService } from '../../../core/services/upload.service';
import {
  MiseAJourProfil,
  OrganizerProfileService,
  ProfilOrganisateur,
} from '../../../core/services/organizer-profile.service';

import { Category } from '../../../core/models/category.model';
import { City } from '../../../core/models/city.model';
import { Organizer } from '../../../core/models/organizer.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

type SectionId = 'organisation' | 'responsable' | 'reversement' | 'notifications' | 'securite';

interface Message {
  type: 'succes' | 'erreur';
  texte: string;
}

interface EtatSection {
  message: WritableSignal<Message | null>;
  enCours: WritableSignal<boolean>;
}

// ── Mêmes règles que le serveur (le serveur reste la référence : ceci évite
// seulement un aller-retour inutile pour une erreur de saisie évidente) ──
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_NUMERO = /^7\d{8}$/;
const TAILLE_MAX_LOGO = 5 * 1024 * 1024;
const FORMATS_LOGO = ['image/jpeg', 'image/png', 'image/webp'];

// '+221 77 123 45 67' → '771234567'
export function normaliserNumero(brut: string): string {
  const s = (brut ?? '').replace(/[\s.\-()]/g, '');
  for (const prefixe of ['+221', '00221', '221']) {
    if (s.startsWith(prefixe) && s.length > 9) return s.slice(prefixe.length);
  }
  return s;
}

export interface CritereMotDePasse {
  label: string;
  ok: boolean;
}

export function criteresMotDePasse(mdp: string): CritereMotDePasse[] {
  return [
    { label: 'Au moins 8 caractères', ok: mdp.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(mdp) },
    { label: 'Une minuscule', ok: /[a-z]/.test(mdp) },
    { label: 'Un chiffre', ok: /\d/.test(mdp) },
    { label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(mdp) },
  ];
}

@Component({
  selector: 'app-organizer-settings-component',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './organizer-settings-component.html',
})
export class OrganizerSettingsComponent implements OnInit {
  // ───────── Données ─────────
  profil = signal<ProfilOrganisateur | null>(null);
  categories = signal<Category[]>([]);
  cities = signal<City[]>([]);
  chargement = signal(true);
  erreurChargement = signal<string | null>(null);

  // ───────── Formulaire : organisation ─────────
  nomOrg = signal('');
  numeroRC = signal('');
  categorieId = signal('');
  description = signal('');
  logoUrl = signal('');
  logoEnCours = signal(false);

  // ───────── Formulaire : responsable ─────────
  prenom = signal('');
  nom = signal('');
  email = signal('');
  villeId = signal('');
  mdpResponsable = signal('');

  // ───────── Formulaire : compte de reversement ─────────
  methode = signal<'wave' | 'orange_money'>('wave');
  numero = signal('');
  titulaire = signal('');
  mdpReversement = signal('');

  // ───────── Formulaire : notifications ─────────
  alertes = signal(true);

  // ───────── Formulaire : sécurité ─────────
  mdpActuel = signal('');
  mdpNouveau = signal('');
  mdpConfirmation = signal('');
  voirMdp = signal(false);

  // Un état (message + « en cours ») par section : un enregistrement ne
  // perturbe jamais l'affichage des autres sections.
  private creerEtat(): EtatSection {
    return { message: signal<Message | null>(null), enCours: signal(false) };
  }
  etats: Record<SectionId, EtatSection> = {
    organisation: this.creerEtat(),
    responsable: this.creerEtat(),
    reversement: this.creerEtat(),
    notifications: this.creerEtat(),
    securite: this.creerEtat(),
  };

  // ───────── Quelles sections ont des modifications non enregistrées ? ─────────
  organisationModifiee = computed(() => {
    const p = this.profil();
    return (
      !!p &&
      (this.nomOrg() !== p.organizationName ||
        this.numeroRC() !== p.registrationNumber ||
        this.categorieId() !== p.categoryId ||
        this.description() !== p.description ||
        this.logoUrl() !== p.logoUrl)
    );
  });

  emailModifie = computed(() => {
    const p = this.profil();
    return !!p && this.email().trim().toLowerCase() !== p.email.toLowerCase();
  });

  responsableModifie = computed(() => {
    const p = this.profil();
    return (
      !!p &&
      (this.prenom() !== p.firstName || this.nom() !== p.lastName || this.villeId() !== p.cityId || this.email().trim() !== p.email)
    );
  });

  reversementModifie = computed(() => {
    const p = this.profil();
    if (!p) return false;
    const numeroChange = this.numero().trim() !== p.mobileMoneyAccountNumber.trim();
    return this.methode() !== p.paymentMethod || numeroChange || this.titulaire().trim() !== p.mobileMoneyAccountHolder.trim();
  });

  alertesModifiees = computed(() => !!this.profil() && this.alertes() !== this.profil()!.receivesSaleAlerts);

  // ───────── Robustesse du nouveau mot de passe (mêmes critères que l'inscription) ─────────
  criteres = computed(() => criteresMotDePasse(this.mdpNouveau()));
  nbCriteres = computed(() => this.criteres().filter((c) => c.ok).length);
  // 8 caractères minimum ET au moins 4 critères sur 5
  mdpAcceptable = computed(() => this.mdpNouveau().length >= 8 && this.nbCriteres() >= 4);
  niveauMdp = computed(() => {
    if (!this.mdpNouveau()) return '';
    const n = this.nbCriteres();
    return n <= 2 ? 'Faible' : n === 3 ? 'Moyen' : n === 4 ? 'Bon' : 'Robuste';
  });

  // ───────── Résumé et complétude du profil (colonne de droite) ─────────
  initiales = computed(() => (this.profil()?.organizationName ?? '').slice(0, 2).toUpperCase());

  membreDepuis = computed(() => {
    const date = this.profil()?.createdAt;
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date));
  });

  completude = computed(() => {
    const p = this.profil();
    const elements = [
      { label: 'Logo ajouté', ok: !!p?.logoUrl },
      { label: "Description de l'organisation", ok: !!p?.description.trim() },
      { label: "Numéro d'enregistrement", ok: !!p?.registrationNumber.trim() },
      { label: "Catégorie d'activité", ok: !!p?.categoryId },
      { label: 'Ville du responsable', ok: !!p?.cityId },
      { label: 'Compte de reversement configuré', ok: !!p?.mobileMoneyAccountNumber && !!p?.mobileMoneyAccountHolder },
    ];
    const faits = elements.filter((e) => e.ok).length;
    return { elements, pourcentage: Math.round((faits / elements.length) * 100) };
  });

  constructor(
    private profilService: OrganizerProfileService,
    private categoriesService: CategoriesService,
    private citiesService: CitiesService,
    private uploadService: UploadService,
    private eventStore: SelectedEventStore
  ) {}

  ngOnInit() {
    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));
    this.citiesService.getAll().subscribe((c) => this.cities.set(c ?? []));

    this.profilService.getProfil().subscribe({
      next: (p) => {
        this.profil.set(p);
        (['organisation', 'responsable', 'reversement', 'notifications'] as SectionId[]).forEach((s) => this.remplirSection(s, p));
        this.chargement.set(false);
      },
      error: () => {
        this.erreurChargement.set('Impossible de charger votre profil. Vérifiez votre connexion et réessayez.');
        this.chargement.set(false);
      },
    });
  }

  // Remet UNE section du formulaire à l'état enregistré (sans toucher aux autres
  // sections, qui peuvent avoir des modifications en cours).
  private remplirSection(section: SectionId, p: ProfilOrganisateur) {
    switch (section) {
      case 'organisation':
        this.nomOrg.set(p.organizationName);
        this.numeroRC.set(p.registrationNumber);
        this.categorieId.set(p.categoryId);
        this.description.set(p.description);
        this.logoUrl.set(p.logoUrl);
        break;
      case 'responsable':
        this.prenom.set(p.firstName);
        this.nom.set(p.lastName);
        this.email.set(p.email);
        this.villeId.set(p.cityId);
        this.mdpResponsable.set('');
        break;
      case 'reversement':
        this.methode.set(p.paymentMethod);
        this.numero.set(p.mobileMoneyAccountNumber);
        this.titulaire.set(p.mobileMoneyAccountHolder);
        this.mdpReversement.set('');
        break;
      case 'notifications':
        this.alertes.set(p.receivesSaleAlerts);
        break;
    }
  }

  annuler(section: SectionId) {
    const p = this.profil();
    if (p) this.remplirSection(section, p);
    this.etats[section].message.set(null);
  }

  // ═════════════════ Logo ═════════════════

  onLogoSelectionne(event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = ''; // permet de re-choisir le même fichier
    if (!fichier) return;

    if (!FORMATS_LOGO.includes(fichier.type)) {
      this.etats.organisation.message.set({ type: 'erreur', texte: 'Format non supporté (JPEG, PNG ou WebP uniquement).' });
      return;
    }
    if (fichier.size > TAILLE_MAX_LOGO) {
      this.etats.organisation.message.set({ type: 'erreur', texte: 'Image trop volumineuse (5 Mo maximum).' });
      return;
    }

    this.logoEnCours.set(true);
    this.etats.organisation.message.set(null);
    this.uploadService.uploadImage(fichier).subscribe({
      next: (reponse) => {
        this.logoUrl.set(reponse.url); // enregistré avec le reste, au clic sur « Enregistrer »
        this.logoEnCours.set(false);
      },
      error: () => {
        this.etats.organisation.message.set({ type: 'erreur', texte: "L'envoi du logo a échoué. Réessayez." });
        this.logoEnCours.set(false);
      },
    });
  }

  retirerLogo() {
    this.logoUrl.set('');
  }

  // ═════════════════ Enregistrements ═════════════════

  enregistrerOrganisation() {
    if (!this.nomOrg().trim()) return this.erreur('organisation', "Le nom de l'organisation est obligatoire.");
    if (this.nomOrg().length > 200) return this.erreur('organisation', 'Le nom est trop long (200 caractères maximum).');
    if (this.description().length > 1000) return this.erreur('organisation', 'La description est trop longue (1000 caractères maximum).');

    this.envoyer(
      'organisation',
      {
        organizationName: this.nomOrg().trim(),
        registrationNumber: this.numeroRC().trim(),
        categoryId: this.categorieId(),
        description: this.description().trim(),
        logoUrl: this.logoUrl(),
      },
      'Organisation mise à jour.'
    );
  }

  enregistrerResponsable() {
    if (!this.prenom().trim()) return this.erreur('responsable', 'Le prénom est obligatoire.');
    if (!REGEX_EMAIL.test(this.email().trim())) return this.erreur('responsable', "L'adresse email n'est pas valide.");
    if (this.emailModifie() && !this.mdpResponsable()) {
      return this.erreur('responsable', "Saisissez votre mot de passe actuel pour confirmer le changement d'adresse email.");
    }

    const donnees: MiseAJourProfil = {
      firstName: this.prenom().trim(),
      lastName: this.nom().trim(),
      cityId: this.villeId(),
      email: this.email().trim(),
    };
    if (this.emailModifie()) donnees.currentPassword = this.mdpResponsable();
    this.envoyer('responsable', donnees, 'Informations du responsable mises à jour.');
  }

  enregistrerReversement() {
    if (!this.titulaire().trim()) return this.erreur('reversement', 'Le nom du titulaire du compte est obligatoire.');
    if (this.numero().trim() !== this.profil()?.mobileMoneyAccountNumber.trim() && !REGEX_NUMERO.test(normaliserNumero(this.numero()))) {
      return this.erreur('reversement', 'Numéro invalide : 9 chiffres commençant par 7 (ex. 77 123 45 67).');
    }
    if (!this.mdpReversement()) {
      return this.erreur('reversement', 'Saisissez votre mot de passe actuel : vos reversements sont envoyés sur ce compte.');
    }

    this.envoyer(
      'reversement',
      {
        paymentMethod: this.methode(),
        mobileMoneyAccountNumber: this.numero().trim(),
        mobileMoneyAccountHolder: this.titulaire().trim(),
        currentPassword: this.mdpReversement(),
      },
      'Compte de reversement mis à jour. Vos prochains reversements seront envoyés sur ce compte.'
    );
  }

  enregistrerNotifications() {
    this.envoyer('notifications', { receivesSaleAlerts: this.alertes() }, 'Préférences de notification enregistrées.');
  }

  changerMotDePasse() {
    if (!this.mdpActuel()) return this.erreur('securite', 'Saisissez votre mot de passe actuel.');
    if (!this.mdpAcceptable()) {
      return this.erreur('securite', 'Le nouveau mot de passe est trop faible : 8 caractères minimum et au moins 4 critères sur 5.');
    }
    if (this.mdpNouveau() !== this.mdpConfirmation()) return this.erreur('securite', 'La confirmation ne correspond pas au nouveau mot de passe.');
    if (this.mdpNouveau() === this.mdpActuel()) return this.erreur('securite', "Le nouveau mot de passe doit être différent de l'ancien.");

    const etat = this.etats.securite;
    etat.enCours.set(true);
    etat.message.set(null);
    this.profilService.changerMotDePasse(this.mdpActuel(), this.mdpNouveau()).subscribe({
      next: () => {
        etat.enCours.set(false);
        this.mdpActuel.set('');
        this.mdpNouveau.set('');
        this.mdpConfirmation.set('');
        etat.message.set({ type: 'succes', texte: 'Mot de passe modifié. Utilisez-le à votre prochaine connexion.' });
      },
      error: (e) => {
        etat.enCours.set(false);
        etat.message.set({ type: 'erreur', texte: this.messageErreur(e) });
      },
    });
  }

  // ═════════════════ Outils internes ═════════════════

  private erreur(section: SectionId, texte: string) {
    this.etats[section].message.set({ type: 'erreur', texte });
  }

  private envoyer(section: SectionId, donnees: MiseAJourProfil, messageSucces: string) {
    const etat = this.etats[section];
    etat.enCours.set(true);
    etat.message.set(null);

    this.profilService.modifierProfil(donnees).subscribe({
      next: (p) => {
        etat.enCours.set(false);
        this.profil.set(p);
        this.remplirSection(section, p); // uniquement cette section : les autres gardent leur saisie en cours
        if (section === 'organisation') this.synchroniserEnTete(p);
        etat.message.set({ type: 'succes', texte: messageSucces });
      },
      error: (e) => {
        etat.enCours.set(false);
        etat.message.set({ type: 'erreur', texte: this.messageErreur(e) });
      },
    });
  }

  // Le nom et le logo s'affichent dans l'en-tête de l'espace : on les met à jour
  // tout de suite, sans attendre un rechargement de la page.
  private synchroniserEnTete(p: ProfilOrganisateur) {
    this.eventStore.organizer.update((o) =>
      o ? (Object.assign({}, o, { organizationName: p.organizationName, logoUrl: p.logoUrl || undefined }) as Organizer) : o
    );
  }

  // Le serveur renvoie les erreurs sous plusieurs formes ({champ: ["message"]},
  // {champ: "message"}, {erreur: "message"}) : on les met toutes à plat.
  private messageErreur(e: unknown): string {
    if (!(e instanceof HttpErrorResponse)) return "Une erreur inattendue s'est produite.";
    if (e.status === 0) return 'Connexion au serveur impossible. Vérifiez votre connexion.';
    if (e.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.';
    if (e.status === 401 || e.status === 403) return 'Accès refusé. Reconnectez-vous puis réessayez.';

    const corps = e.error;
    if (corps && typeof corps === 'object') {
      const morceaux: string[] = [];
      for (const valeur of Object.values(corps)) {
        if (typeof valeur === 'string') morceaux.push(valeur);
        else if (Array.isArray(valeur)) morceaux.push(...valeur.filter((v): v is string => typeof v === 'string'));
      }
      if (morceaux.length > 0) return morceaux.join(' ');
    }
    return "L'enregistrement a échoué. Réessayez.";
  }
}
