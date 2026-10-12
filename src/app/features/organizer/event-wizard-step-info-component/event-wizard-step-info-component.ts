import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { FormsModule } from '@angular/forms';
import { Category, City, EventEntity } from '../../../core/models';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CategoriesService } from '../../../core/services/categories.service';
import { CitiesService } from '../../../core/services/cities.service';
import { UploadService } from '../../../core/services/upload.service';


// ═══════════ RÈGLES DE DATES (fonctions simples, pas un composant) ═══════════
// Règles de dates d'un événement, côté interface.
// Fonctions pures (aucune dépendance Angular) : faciles à tester et à réutiliser.

const pad = (n: number) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' dans le fuseau LOCAL (toISOString() donnerait l'UTC, donc parfois la veille)
function dateLocaleISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function aujourdhuiISO(maintenant: Date = new Date()): string {
  return dateLocaleISO(maintenant);
}

// Transforme une date ISO venant du serveur en deux champs de formulaire
// (date 'YYYY-MM-DD' + heure 'HH:MM'), en heure locale.
function decouperDateHeure(iso?: string): { date: string; heure: string } {
  if (!iso) return { date: '', heure: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', heure: '' };
  return { date: dateLocaleISO(d), heure: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

interface ParamsDates {
  dateDebut: string;
  heureDebut: string;
  dateFin: string;
  heureCloture: string;
  // Début déjà enregistré (mode modification) : si on n'y touche pas, on ne
  // reproche pas à l'organisateur une date de début devenue passée.
  debutInitialISO?: string;
  maintenant?: Date;
}

// Renvoie un message d'erreur, ou null si tout est valide.
function erreurDates(p: ParamsDates): string | null {
  const maintenant = p.maintenant ?? new Date();
  const debut = new Date(`${p.dateDebut}T${p.heureDebut}:00`);
  const fin = new Date(`${p.dateFin}T${p.heureCloture || p.heureDebut}:00`);

  if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return 'Date ou heure invalide.';

  const minute = (d: Date) => Math.floor(d.getTime() / 60000);
  const initial = p.debutInitialISO ? new Date(p.debutInitialISO) : null;
  const debutModifie = !initial || isNaN(initial.getTime()) || minute(initial) !== minute(debut);

  if (debutModifie) {
    if (p.dateDebut < aujourdhuiISO(maintenant)) {
      return 'La date de début ne peut pas être antérieure à aujourd\u2019hui.';
    }
    if (debut.getTime() <= maintenant.getTime()) {
      return 'L\u2019heure de début est déjà passée : choisissez une heure à venir.';
    }
  }

  if (fin.getTime() <= debut.getTime()) {
    return 'La date de fin doit être postérieure à la date de début (si l\u2019événement finit le même jour, précisez une heure de clôture après l\u2019heure de début).';
  }
  return null;
}
// ═══════════ FIN DES RÈGLES DE DATES ═══════════


interface SiteConnu {
  label: string;
  venue: string;
  cityId: string;
}

const IMAGE_PLACEHOLDER = 'https://placehold.co/1200x630?text=Affiche+evenement';

const FORMATS_EXPERIENCE = [
  'Festival Plein Air (Open Air)',
  'Salle Couverte / Intérieur',
  'Événement Hybride (Présentiel + Streaming)',
  'Conférence / Séminaire',
  'Soirée Privée / Sur Invitation',
];

// Quelques lieux connus au Sénégal, en simple raccourci de saisie —
// pas une vraie base de lieux, juste pour accélérer le remplissage.
const SITES_CONNUS: SiteConnu[] = [
  { label: 'Monument de la Renaissance (Dakar)', venue: 'Esplanade du Monument de la Renaissance Africaine', cityId: 'city-001' },
  { label: 'Grand Théâtre National', venue: 'Grand Théâtre National', cityId: 'city-001' },
  { label: 'Esplanade CICES Dakar', venue: 'Esplanade CICES', cityId: 'city-001' },
  { label: 'Canal Olympia', venue: 'Canal Olympia Teranga', cityId: 'city-001' },
  { label: 'Saly Portudal', venue: 'Plage de Saly', cityId: 'city-004' },
];
@Component({
  imports: [FormsModule, IconComponent, RevealDirective],
  selector: 'app-event-wizard-step-info-component',
  styleUrl: './event-wizard-step-info-component.css',
  templateUrl: './event-wizard-step-info-component.html',
})
export class EventWizardStepInfoComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) valeursInitiales!: Partial<EventEntity>;
  @Output() etapeCompletee = new EventEmitter<Partial<EventEntity>>();

  categories = signal<Category[]>([]);
  cities = signal<City[]>([]);
  formatsExperience = FORMATS_EXPERIENCE;
  sitesConnus = SITES_CONNUS;

  erreurValidation = signal<string | null>(null);

  // Champs du formulaire
  titre = signal('');
  categoryId = signal('');
  experienceFormat = signal('');
  lineup = signal<string[]>([]);
  nouvelArtiste = signal('');
  description = signal('');

  dateDebut = signal('');
  dateFin = signal('');
  heureOuverture = signal('');
  heureDebut = signal('');
  heureCloture = signal('');

  venue = signal('');
  cityId = signal('');
  address = signal('');
  maxCapacite = signal(0);

  coverImageUrl = signal('');
  bannerImageUrl = signal('');
  teaserVideoUrl = signal('');
  autorisationSiteConfirmee = signal(false);

  uploadEnCours = signal(false);

  // Pour l'attribut [min] des champs date : le calendrier grise les jours
  // passés. Pure aide visuelle — la vraie vérification est dans continuer()
  // puis, côté serveur, dans EventCreateSerializer.
  get dateMinDebut() { return aujourdhuiISO(); }
  get dateMinFin() { return this.dateDebut() || aujourdhuiISO(); }

  // Ponts ngModel <-> signals
  get titreModel() { return this.titre(); } set titreModel(v: string) { this.titre.set(v); }
  get categoryIdModel() { return this.categoryId(); } set categoryIdModel(v: string) { this.categoryId.set(v); }
  get experienceFormatModel() { return this.experienceFormat(); } set experienceFormatModel(v: string) { this.experienceFormat.set(v); }
  get nouvelArtisteModel() { return this.nouvelArtiste(); } set nouvelArtisteModel(v: string) { this.nouvelArtiste.set(v); }
  get descriptionModel() { return this.description(); } set descriptionModel(v: string) { this.description.set(v); }
  get dateDebutModel() { return this.dateDebut(); } set dateDebutModel(v: string) { this.dateDebut.set(v); }
  get dateFinModel() { return this.dateFin(); } set dateFinModel(v: string) { this.dateFin.set(v); }
  get heureOuvertureModel() { return this.heureOuverture(); } set heureOuvertureModel(v: string) { this.heureOuverture.set(v); }
  get heureDebutModel() { return this.heureDebut(); } set heureDebutModel(v: string) { this.heureDebut.set(v); }
  get heureClotureModel() { return this.heureCloture(); } set heureClotureModel(v: string) { this.heureCloture.set(v); }
  get venueModel() { return this.venue(); } set venueModel(v: string) { this.venue.set(v); }
  get cityIdModel() { return this.cityId(); } set cityIdModel(v: string) { this.cityId.set(v); }
  get addressModel() { return this.address(); } set addressModel(v: string) { this.address.set(v); }
  get maxCapaciteModel() { return this.maxCapacite(); } set maxCapaciteModel(v: number) { this.maxCapacite.set(Number(v)); }
  get teaserVideoUrlModel() { return this.teaserVideoUrl(); } set teaserVideoUrlModel(v: string) { this.teaserVideoUrl.set(v); }
  get autorisationSiteModel() { return this.autorisationSiteConfirmee(); } set autorisationSiteModel(v: boolean) { this.autorisationSiteConfirmee.set(v); }

  villeAffichee = computed(() => this.cities().find((c) => c.id === this.cityId())?.name ?? '');

  urlApercuCarte = computed<SafeResourceUrl | null>(() => {
    if (!this.venue() && !this.address()) return null;
    const adresse = encodeURIComponent(`${this.venue()}, ${this.address()}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${adresse}&output=embed`);
  });

  constructor(
    private categoriesService: CategoriesService,
    private citiesService: CitiesService,
    private uploadService: UploadService
  ) {}

  ngOnInit() {
    this.categoriesService.getAll().subscribe((c) => this.categories.set(c ?? []));
    this.citiesService.getAll().subscribe((c) => this.cities.set(c ?? []));

    // Reprend les valeurs déjà saisies si on revient sur cette étape
    const v = this.valeursInitiales;
    this.titre.set(v.title ?? '');
    this.categoryId.set(v.categoryId ?? '');
    this.experienceFormat.set(v.experienceFormat ?? '');
    this.lineup.set(v.lineup ?? []);
    this.description.set(v.description ?? '');
    this.venue.set(v.venue ?? '');
    this.cityId.set(v.cityId ?? '');
    this.address.set(v.address ?? '');
    this.maxCapacite.set(v.maxCapacity ?? 0);
    this.coverImageUrl.set(v.coverImageUrl ?? '');
    this.bannerImageUrl.set(v.bannerImageUrl ?? '');
    this.teaserVideoUrl.set(v.teaserVideoUrl ?? '');

    // ⚠️ Ces champs n'étaient jamais repris : en modification (ou en revenant
    // sur cette étape), les dates et heures apparaissaient vides et il
    // fallait tout ressaisir.
    const debut = decouperDateHeure(v.startDate);
    const fin = decouperDateHeure(v.endDate);
    const portes = decouperDateHeure(v.doorsOpenTime);
    this.dateDebut.set(debut.date);
    this.heureDebut.set(debut.heure);
    this.dateFin.set(fin.date);
    this.heureCloture.set(fin.heure);
    this.heureOuverture.set(portes.heure);
  }

  ajouterArtiste() {
    const nom = this.nouvelArtiste().trim();
    if (!nom) return;
    this.lineup.update((liste) => [...liste, nom]);
    this.nouvelArtiste.set('');
  }

  retirerArtiste(nom: string) {
    this.lineup.update((liste) => liste.filter((a) => a !== nom));
  }

  choisirSiteConnu(site: SiteConnu) {
    this.venue.set(site.venue);
    this.cityId.set(site.cityId);
  }

  onAfficheSelectionnee(event: Event) {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;

    this.uploadEnCours.set(true);
    this.uploadService.uploadImage(fichier).subscribe({
      next: (reponse) => {
        this.coverImageUrl.set(reponse.url);
        this.uploadEnCours.set(false);
      },
      error: () => {
        this.erreurValidation.set("L'envoi de l'affiche a échoué. Réessayez.");
        this.uploadEnCours.set(false);
      },
    });
  }


  onBanniereSelectionnee(event: Event) {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;

    this.uploadEnCours.set(true);
    this.uploadService.uploadImage(fichier).subscribe({
      next: (reponse) => {
        this.bannerImageUrl.set(reponse.url);
        this.uploadEnCours.set(false);
      },
      error: () => {
        this.erreurValidation.set("L'envoi de la bannière a échoué. Réessayez.");
        this.uploadEnCours.set(false);
      },
    });
  }


  continuer() {
    if (
      !this.titre().trim() ||
      !this.categoryId() ||
      !this.description().trim() ||
      !this.dateDebut() ||
      !this.dateFin() ||
      !this.heureDebut() ||
      !this.venue().trim() ||
      !this.cityId() ||
      this.maxCapacite() <= 0 ||
      !this.coverImageUrl()
    ) {
      this.erreurValidation.set('Merci de compléter tous les champs obligatoires (*) avant de continuer.');
      return;
    }

    // Règles de dates : pas de début dans le passé (jour ET heure), fin
    // strictement après le début.
    const erreurDate = erreurDates({
      dateDebut: this.dateDebut(),
      heureDebut: this.heureDebut(),
      dateFin: this.dateFin(),
      heureCloture: this.heureCloture(),
      debutInitialISO: this.valeursInitiales?.startDate,
    });
    if (erreurDate) {
      this.erreurValidation.set(erreurDate);
      return;
    }
    this.erreurValidation.set(null);

    const startDate = `${this.dateDebut()}T${this.heureDebut()}:00`;
    const endDate = `${this.dateFin()}T${this.heureCloture() || this.heureDebut()}:00`;
    const doorsOpenTime = this.heureOuverture() ? `${this.dateDebut()}T${this.heureOuverture()}:00` : undefined;

    this.etapeCompletee.emit({
      title: this.titre(),
      categoryId: this.categoryId(),
      experienceFormat: this.experienceFormat() || undefined,
      lineup: this.lineup(),
      description: this.description(),
      startDate,
      endDate,
      doorsOpenTime,
      venue: this.venue(),
      cityId: this.cityId(),
      address: this.address(),
      maxCapacity: this.maxCapacite(),
      coverImageUrl: this.coverImageUrl(),
      bannerImageUrl: this.bannerImageUrl() || undefined,
      teaserVideoUrl: this.teaserVideoUrl() || undefined,
    });

  }
}

