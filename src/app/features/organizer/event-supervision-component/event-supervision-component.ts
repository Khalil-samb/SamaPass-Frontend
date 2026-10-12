import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SelectedEventStore } from '../../../core/state/selected-event.store';
import { AccessGatesService } from '../../../core/services/access-gates.service';
import { ScannerAgentsService } from '../../../core/services/scanner-agents.service';
import { TicketsService } from '../../../core/services/tickets.service';

import { AccessGate } from '../../../core/models/access-gate.model';
import { ScannerAgent } from '../../../core/models/scanner-agent.model';
import { Ticket } from '../../../core/models/ticket.model';

import { IconComponent } from '../../../shared/ui/icon-component/icon-component';

interface StatsPorte {
  gate: AccessGate;
  entreesValidees: number;
  agentsAssignes: number;
}

const LABEL_ROLE: Record<string, string> = {
  operator: 'Opérateur Scanner',
  supervisor: 'Superviseur Portique',
  disputes_manager: 'Gestionnaire Litiges',
};

@Component({
  selector: 'app-event-supervision-component',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './event-supervision-component.html',
})
export class EventSupervisionComponent implements OnInit {
  gates = signal<AccessGate[]>([]);
  agents = signal<ScannerAgent[]>([]);
  tickets = signal<Ticket[]>([]);

  constructor(
    public eventStore: SelectedEventStore,
    private accessGatesService: AccessGatesService,
    private scannerAgentsService: ScannerAgentsService,
    private ticketsService: TicketsService
  ) {}

  ngOnInit() {
    const eventId = this.eventStore.selectedEventId();
    if (!eventId) return;

    this.accessGatesService.getByEvent(eventId).subscribe((g) => this.gates.set(g ?? []));
    this.scannerAgentsService.getByEvent(eventId).subscribe((a) => this.agents.set(a ?? []));
    this.ticketsService.billetsDeEvenement(eventId).subscribe((t) => this.tickets.set(t ?? []));
  }

  totalVendus = computed(() => this.tickets().length);
  totalScannes = computed(() => this.tickets().filter((t) => t.status === 'used').length);
  tauxScan = computed(() => (this.totalVendus() > 0 ? Math.round((this.totalScannes() / this.totalVendus()) * 100) : 0));

  statsParPorte = computed<StatsPorte[]>(() => {
    const tickets = this.tickets();
    return this.gates().map((gate) => ({
      gate,
      entreesValidees: tickets.filter((t: any) => t.gate === gate.id && t.status === 'used').length,
      agentsAssignes: this.agents().filter((a: any) => a.gate === gate.id).length,
    }));
  });

  nomPorte(gateId: string): string {
    return this.gates().find((g) => g.id === gateId)?.name ?? '';
  }

  labelRole(role: string): string {
    return LABEL_ROLE[role] ?? role;
  }

  renvoyerCode(agent: ScannerAgent) {
    const texte = `Bonjour ${agent.name}, votre code PIN SamaPass Scanner pour ${this.nomPorte((agent as any).gate)} : ${agent.pinCode}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank');
  }
}
