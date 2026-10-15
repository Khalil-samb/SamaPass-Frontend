import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { forkJoin } from 'rxjs';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { ScannerAgentsService } from '../../../core/services/scanner-agents.service';
import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

// Un agent tel que Django le renvoie : « gate » est l'IDENTIFIANT de sa porte (l'API ne donne pas son nom).
interface AgentBrut { id: string; name: string; phone: string; role: string; gate: string; pinCode: string; }
interface PorteBrute { id: string; name: string; label: string; }

// Ce que la carte affiche pour chaque agent
export interface AgentAvecCode {
  id: string; name: string; phone: string; roleLabel: string;
  porteNom: string; porteLabel: string; pinCode: string; lienWhatsApp: string;
}

const LIBELLE_ROLE: Record<string, string> = {
  operator: 'Opérateur',
  supervisor: 'Superviseur',
  disputes_manager: 'Gestionnaire litiges',
};

// Numéro au format attendu par wa.me : chiffres seulement, avec l'indicatif du pays.
// « 77 123 45 67 » → 221771234567. Renvoie null si le numéro n'est pas exploitable : dans ce cas
// WhatsApp s'ouvre sans destinataire et l'organisateur choisit lui-même le contact.
export function numeroWhatsApp(brut: string): string | null {
  const chiffres = (brut ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
  if (/^7\d{8}$/.test(chiffres)) return '221' + chiffres; // numéro sénégalais écrit sans indicatif
  if (/^221\d{9}$/.test(chiffres)) return chiffres; // déjà avec l'indicatif
  return /^\d{10,15}$/.test(chiffres) ? chiffres : null; // numéro étranger complet
}

// Même message que celui de la page de modification d'événement
export function messageCodeAgent(nom: string, porte: string, pin: string): string {
  return `Bonjour ${nom}, voici votre code PIN Kcrowd Scanner pour la porte ${porte} : ${pin}. Téléchargez l'application Kcrowd Scanner et entrez ce code pour commencer.`;
}

@Component({
  imports: [RouterLink, IconComponent, RevealDirective],
  standalone:true,
  selector: 'app-event-published-component',
  styleUrl: './event-published-component.css',
  templateUrl: './event-published-component.html',
})
export class EventPublishedComponent implements OnInit {
  private eventId = signal('');
  introuvable = signal(false);
  lienCopie = signal(false);
  codeCopie = signal<string | null>(null); // identifiant de l'agent dont le code vient d'être copié

  // ⚠️ Les données viennent du store de l'organisateur (les VRAIES, catégories de billets comprises).
  // Avant, l'événement était cherché dans le catalogue public et les catégories dans
  // TicketTypesService.getAll(), qui lit encore un fichier de maquette : le compteur affichait 0 / 0.
  event = computed(() => this.eventStore.events().find((e) => e.id === this.eventId()) ?? null);
  ticketTypes = computed(() => this.event()?.ticketTypes ?? []);

  totalCapacite = computed(() => this.ticketTypes().reduce((s, t) => s + t.quantityTotal, 0));
  totalVendu = computed(() => this.ticketTypes().reduce((s, t) => s + t.quantitySold, 0));
  // Le libellé de la carte dit « PASS DISPONIBLES » : on affiche donc les places restantes
  totalDisponible = computed(() => this.totalCapacite() - this.totalVendu());

  // ── Codes PIN des agents de contrôle ──
  private agentsBruts = signal<AgentBrut[]>([]);
  private portes = signal<PorteBrute[]>([]);
  chargementAgents = signal(true);
  erreurAgents = signal<string | null>(null);

  agents = computed<AgentAvecCode[]>(() =>
    this.agentsBruts().map((a) => {
      const porte = this.portes().find((p) => p.id === a.gate);
      const porteNom = porte?.name ?? '—';
      const numero = numeroWhatsApp(a.phone);
      const texte = encodeURIComponent(messageCodeAgent(a.name, porteNom, a.pinCode));
      return {
        id: a.id,
        name: a.name,
        phone: a.phone,
        roleLabel: LIBELLE_ROLE[a.role] ?? a.role,
        porteNom,
        porteLabel: porte?.label ?? '',
        pinCode: a.pinCode,
        lienWhatsApp: numero ? `https://wa.me/${numero}?text=${texte}` : `https://wa.me/?text=${texte}`,
      };
    })
  );

  urlPublique = computed(() => `${window.location.origin}/evenements/${this.event()?.id ?? ''}`);
  // QR Code généré ICI, dans le navigateur (même bibliothèque « qrcode » que le billet) : aucun service externe,
  // et on peut en tirer un PNG net pour l'impression et un SVG vectoriel.
  urlQrCode = signal('');   // image PNG (affichage + téléchargement)
  urlQrSvg = signal('');    // fichier SVG vectoriel (téléchargement)

  private async genererQr(texte: string) {
    try {
      const module: any = await import('qrcode');
      const lib = module.toDataURL ? module : module.default;
      const png: string = await lib.toDataURL(texte, { width: 640, margin: 2, errorCorrectionLevel: 'M' });
      const svg: string = await lib.toString(texte, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' });
      this.urlQrCode.set(png);
      this.urlQrSvg.set('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    } catch (erreur) {
      console.error('Impossible de générer le QR Code :', erreur);
    }
  }

  // Moyens de paiement réellement activés pour CET événement
  moyensPaiement = computed(() => {
    const libelles: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', card: 'Carte bancaire' };
    return (this.event()?.acceptedPaymentMethods ?? []).map((m) => libelles[m] ?? m);
  });

  initiale(nom: string): string {
    return (nom ?? '?').trim().charAt(0).toUpperCase() || '?';
  }

  dateLabel = computed(() => {
    const ev = this.event();
    if (!ev) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ev.startDate));
  });

  lienWhatsApp = computed(() => `https://wa.me/?text=${encodeURIComponent(`${this.event()?.title} — Réservez vos billets ici : ${this.urlPublique()}`)}`);
  lienFacebook = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.urlPublique())}`);
  lienTwitter = computed(() => `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.urlPublique())}&text=${encodeURIComponent(this.event()?.title ?? '')}`);
  lienEmail = computed(() => `mailto:?subject=${encodeURIComponent(this.event()?.title ?? '')}&body=${encodeURIComponent('Réservez vos billets ici : ' + this.urlPublique())}`);

  constructor(
    private route: ActivatedRoute,
    private accessGatesService: AccessGatesService,
    private scannerAgentsService: ScannerAgentsService,
    public eventStore: SelectedEventStore
  ) {
    // Dès que l'événement est connu, on fabrique le QR Code de son lien public
    effect(() => {
      if (this.event()) void this.genererQr(this.urlPublique());
    });
  }

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) return;
    this.eventId.set(eventId);

    // Recharge le store pour que le nouvel événement apparaisse (dans cette page et dans le sélecteur
    // de la sidebar), et le sélectionne directement. S'il n'y est toujours pas une fois rechargé,
    // il n'existe pas ou n'appartient pas à cet organisateur : on le dit au lieu de charger sans fin.
    this.eventStore.selectionner(eventId);
    void this.eventStore.rafraichir().then(() => {
      if (!this.event()) this.introuvable.set(true);
    });

    this.chargerAgents();
  }

  // Les codes sont LUS dans la base à chaque ouverture de la page : ils survivent à un
  // rafraîchissement (F5) ou au bouton Retour, contrairement à des codes passés de page en page.
  chargerAgents() {
    const eventId = this.eventId();
    if (!eventId) return;
    this.chargementAgents.set(true);
    this.erreurAgents.set(null);

    forkJoin({
      agents: this.scannerAgentsService.getByEvent(eventId),
      portes: this.accessGatesService.getByEvent(eventId),
    }).subscribe({
      next: ({ agents, portes }) => {
        this.agentsBruts.set((agents ?? []) as unknown as AgentBrut[]);
        this.portes.set((portes ?? []) as unknown as PorteBrute[]);
        this.chargementAgents.set(false);
      },
      error: () => {
        this.erreurAgents.set('Impossible de charger les codes de vos agents. Vérifiez votre connexion.');
        this.chargementAgents.set(false);
      },
    });
  }

  copierLien() {
    navigator.clipboard.writeText(this.urlPublique());
    this.lienCopie.set(true);
    setTimeout(() => this.lienCopie.set(false), 2000);
  }

  async copierCode(agent: AgentAvecCode) {
    try {
      await navigator.clipboard.writeText(agent.pinCode);
    } catch {
      return; // presse-papiers indisponible : le code reste affiché en grand, on peut le recopier à la main
    }
    this.codeCopie.set(agent.id);
    setTimeout(() => {
      if (this.codeCopie() === agent.id) this.codeCopie.set(null);
    }, 2000);
  }
}

