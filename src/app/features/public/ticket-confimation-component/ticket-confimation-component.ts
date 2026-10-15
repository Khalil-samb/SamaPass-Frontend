import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TicketsService } from '../../../core/services/tickets.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { EventsService } from '../../../core/services/events.service';
import { CitiesService } from '../../../core/services/cities.service';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments';

import { Ticket } from '../../../core/models/ticket.model';
import { Transaction } from '../../../core/models/transaction.model';
import { EventEntity } from '../../../core/models/event.model';
import { City } from '../../../core/models/city.model';
import { TicketType } from '../../../core/models/ticket-type.model';
import { User } from '../../../core/models/user.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';
import { CardEventComponent, EventCardVM } from '../../../shared/ui/card-event-component/card-event-component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { construireCarteEvenement } from '../../../shared/utils/event-card.util';

interface LigneAchat {
  nom: string;
  quantite: number;
  prixUnitaire: number;
}

@Component({
  imports: [IconComponent, CardEventComponent, RouterLink, RevealDirective],
  selector: 'app-ticket-confimation-component',
  styleUrl: './ticket-confimation-component.css',
  templateUrl: './ticket-confimation-component.html',
})
export class TicketConfirmationComponent implements OnInit {
  loading = signal(true);

  ticket = signal<Ticket | null>(null);
  transaction = signal<Transaction | null>(null);
  event = signal<EventEntity | null>(null);
  cities = signal<City[]>([]);
  ticketTypesDeLEvenement = signal<TicketType[]>([]);
  ticketsMemeTransaction = signal<Ticket[]>([]);
  evenementsRecommandes = signal<EventCardVM[]>([]);

  nomProfil = signal('');
  telephoneProfil = signal('');
  profilEnregistre = signal(false);

  cityName = computed(() => this.cities().find((c) => c.id === this.event()?.cityId)?.name ?? '');

  nomTitulaire = computed(() => {
    const u = this.authStore.currentUser();
    return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : '';
  });

  lignesAchat = computed<LigneAchat[]>(() => {
    const types = this.ticketTypesDeLEvenement();
    const parType = new Map<string, number>();
    this.ticketsMemeTransaction().forEach((t: any) => {
      parType.set(t.ticketType, (parType.get(t.ticketType) ?? 0) + 1);
    });
    return Array.from(parType.entries()).map(([ticketTypeId, quantite]) => {
      const type = types.find((t) => t.id === ticketTypeId);
      return { nom: type?.name ?? 'Billet', quantite, prixUnitaire: type?.price ?? 0 };
    });
  });

  montantTotalLabel = computed(() => `${(this.transaction()?.amount ?? this.ticketsMemeTransaction().reduce((s: number, b: any) => s + Number(b.price ?? 0), 0)).toLocaleString('fr-FR')} FCFA`);

  idBilletFormate = computed(() => (this.ticket()?.id ?? '').toUpperCase().slice(0, 16));

  // Ce que la page imprime, c'est CE billet — pas toute la commande : sa catégorie et SON prix.
  // (Avant, elle affichait le total de la commande et « x2 billets » à côté d'un seul QR Code.)
  private typeDuBillet = computed(() => {
    const billet: any = this.ticket();
    return this.ticketTypesDeLEvenement().find((t) => t.id === billet?.ticketType);
  });
  categorieDuBillet = computed(() => this.typeDuBillet()?.name ?? 'Billet');
  prixDuBilletLabel = computed(() => {
    const billet: any = this.ticket();
    const prix = Number(billet?.price ?? this.typeDuBillet()?.price ?? 0);
    return `${prix.toLocaleString('fr-FR')} FCFA`;
  });
  nombreBilletsCommande = computed(() => this.ticketsMemeTransaction().length);

  // Le code à dicter si le QR est abîmé : les 8 derniers caractères de l'identifiant du billet — exactement ce que
  // cherche la « saisie manuelle de secours » de Django (ScannerBilletView). L'ancien « S/N » affiché montrait les
  // 16 PREMIERS caractères : impossible de s'en servir pour cette saisie.
  codeSecours = computed(() => (this.ticket()?.id ?? '').replace(/-/g, '').slice(-8).toUpperCase());

  dateAchatLabel = computed(() => {
    const t = this.transaction();
    const dateInvite = (this.ticket() as any)?.purchaseDate;
    if (!t && dateInvite) return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(dateInvite));
    if (!t) return '';
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(t.createdAt));
  });

  dateEvenementLabel = computed(() => {
    const ev = this.event();
    if (!ev) return '';
    const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ev.startDate));
    return jour.charAt(0).toUpperCase() + jour.slice(1);
  });

  heureOuvertureLabel = computed(() => {
    const heure = this.event()?.doorsOpenTime;
    return heure ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(heure)) : '';
  });

  labelMoyenPaiement = computed(() => {
    const m = this.transaction()?.paymentMethod;
    const labels: Record<string, string> = { wave: 'Wave Pay', orange_money: 'Orange Money', free_money: 'Free Money', card: 'Carte Bancaire' };
    return m ? labels[m] : '';
  });

  // QR Code généré ICI, dans le navigateur (bibliothèque « qrcode ») : plus aucun service externe, donc il s'affiche
  // et s'imprime même sans internet. Le contenu est inchangé (le texte « QR-… » que le scanner cherche en base).
  urlQrCode = signal('');
  qrEnErreur = signal(false);

  private async genererQrCode(texte: string) {
    try {
      const module: any = await import('qrcode');
      const toDataURL = module.toDataURL ?? module.default?.toDataURL;
      const image: string = await toDataURL(texte, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
      this.urlQrCode.set(image);
    } catch (erreur) {
      console.error('Impossible de générer le QR Code :', erreur);
      this.qrEnErreur.set(true);
    }
  }

  urlItineraire = computed(() => {
    const ev = this.event();
    if (!ev) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ev.venue}, ${ev.address}`)}`;
  });

  estInvite = computed(() => !this.authStore.currentUser());
  telephoneInvite = computed(() => (this.ticket() as any)?.buyerPhone ?? '');

  // Pas d'envoi automatique : on ouvre WhatsApp vers le numéro de l'acheteur avec le lien de son billet.
  lienWhatsAppInvite = computed(() => {
    const ev = this.event();
    let chiffres = this.telephoneInvite().replace(/\D/g, '');
    if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);
    if (chiffres.length === 9) chiffres = '221' + chiffres;
    const lien = `${window.location.origin}/billet/${this.ticket()?.id}/confirmation`;
    const texte = `Mon billet Kcrowd pour ${ev?.title ?? "l'événement"} : ${lien}`;
    return `https://wa.me/${chiffres}?text=${encodeURIComponent(texte)}`;
  });

  lienWhatsApp = computed(() => {
    const ev = this.event();
    const texte = `Voici mon billet Kcrowd pour ${ev?.title ?? "l'événement"} : ${window.location.href}`;
    return `https://wa.me/?text=${encodeURIComponent(texte)}`;
  });

  constructor(
    private route: ActivatedRoute,
    private ticketsService: TicketsService,
    private transactionsService: TransactionsService,
    private eventsService: EventsService,
    private citiesService: CitiesService,
    private authStore: AuthStore,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    const ticketId = this.route.snapshot.paramMap.get('ticketId');
    if (!ticketId) {
      this.loading.set(false);
      return;
    }

    const utilisateur = this.authStore.currentUser();
    if (utilisateur) {
      this.nomProfil.set(utilisateur.firstName);
      this.telephoneProfil.set(utilisateur.phone);
    }

    try {
      const billet: any = await firstValueFrom(this.estInvite() ? this.ticketsService.getInvite(ticketId) : this.ticketsService.getById(ticketId));
      this.ticket.set(billet);
      void this.genererQrCode(billet.qrCode);

      const [transaction, event] = await Promise.all([
        this.estInvite() ? Promise.resolve(null as any) : firstValueFrom(this.transactionsService.getById(billet.transaction)),
        firstValueFrom(this.eventsService.getById(billet.event)),
      ]);
      this.transaction.set(transaction);
      this.event.set(event);

      this.ticketTypesDeLEvenement.set(event.ticketTypes ?? []);

      const idsInvite = (this.route.snapshot.queryParamMap.get('ids') ?? '').split(',').filter((i) => i && i !== billet.id);
      const tousLesBillets: any[] = this.estInvite()
        ? [billet, ...(await Promise.all(idsInvite.map((i) => firstValueFrom(this.ticketsService.getInvite(i)).catch(() => null)))).filter(Boolean)]
        : await firstValueFrom(this.ticketsService.mesBillets());
      this.ticketsMemeTransaction.set(this.estInvite() ? tousLesBillets : tousLesBillets.filter((t) => t.transaction === billet.transaction));

      this.citiesService.getAll().subscribe((c) => this.cities.set(c ?? []));

      this.eventsService.getAll({ ville: event.cityId }).subscribe((autres) => {
        this.evenementsRecommandes.set(
          autres
            // On ne recommande que ce qu'on peut encore acheter : le catalogue contient aussi les événements terminés (grisés)
            .filter((e) => e.id !== event.id && e.status === 'published' && (e.salesState ?? 'open') === 'open')
            .slice(0, 3)
            .map((e: any) => construireCarteEvenement(e))
        );
      });

      this.loading.set(false);
    } catch (erreur) {
      console.error('Erreur lors du chargement du billet :', erreur);
      this.loading.set(false);
    }
  }

  // La mise en page d'impression (styles.css) ne garde que le billet. Le nom du fichier PDF proposé par le
  // navigateur est le titre de la page : on le rend parlant le temps de l'impression.
  imprimer() {
    const titreAvant = document.title;
    const restaurer = () => {
      document.title = titreAvant;
      window.removeEventListener('afterprint', restaurer);
    };
    document.title = `Billet - ${this.event()?.title ?? 'Kcrowd'} - ${this.idBilletFormate()}`;
    window.addEventListener('afterprint', restaurer);
    window.print();
  }

  ajouterAuWallet() {
    alert('Ajout à Apple / Google Wallet : bientôt disponible.');
  }

  // Le téléphone n'est plus modifiable ici : c'est l'identifiant de
  // connexion (voir UpdateMeView côté Django, qui n'accepte que le
  // prénom/nom). Seul le prénom est vraiment envoyé et mis à jour.
  enregistrerProfil() {
    if (this.estInvite()) return;
    this.http.patch<User>(`${environment.apiUrl}/api/auth/me/`, { firstName: this.nomProfil() }).subscribe({
      next: (utilisateurMisAJour) => {
        this.authStore.mettreAJourUtilisateur(utilisateurMisAJour);
        this.profilEnregistre.set(true);
        setTimeout(() => this.profilEnregistre.set(false), 2500);
      },
    });
  }
}

