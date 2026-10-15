import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

/*
 * Photos instantanées accrochées à une corde. On fait glisser la corde (ou on utilise les flèches) :
 * les photos se balancent sur leurs pinces et se stabilisent avec un petit rebond. Celle du milieu est la
 * photo active. Porté en Angular depuis un composant React ; la simulation est écrite directement dans le DOM
 * à chaque image, hors de la détection de changements d'Angular.
 */

export interface SlidePassee {
  id: string;
  image?: string;
  title: string;
  caption?: string;
}

// ---------- logique pure ----------
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

/** Hauteur d'une corde qui s'affaisse de `sag` entre (0, y0) et (w, y0), au point x. */
function stringY(x: number, w: number, y0: number, sag: number): number {
  const t = clamp(x / w, 0, 1);
  return y0 + 4 * sag * t * (1 - t);
}

/** Un pas de ressort amorti vers la cible. */
function springStep(x: number, v: number, target: number, dt: number, k = 70): [number, number] {
  const c = 2 * Math.sqrt(k);
  const nv = v + (k * (target - x) - c * v) * dt;
  return [x + nv * dt, nv];
}

/** Un pas de balancement d'une photo : elle traîne derrière le mouvement, la gravité la rappelle. */
function swingStep(a: number, w: number, lineVel: number, dt: number, gain: number): [number, number] {
  const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt;
  return [clamp(a + nw * dt, -0.6, 0.6), nw];
}

/** Indice de la photo la plus proche du centre pour un décalage donné. */
function nearestAt(off: number, spacing: number, n: number): number {
  return clamp(Math.round(off / spacing), 0, Math.max(0, n - 1));
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

@Component({
  standalone: true,
  selector: 'app-polaroid-line-carousel-component',
  template: `
    <div
      #racine
      class="pl-root"
      [style.height.px]="height"
      [style.--pl-cw]="cw() + 'px'"
      [attr.data-drag]="dragging() ? '1' : '0'"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Événements passés"
      tabindex="0"
      (keydown)="onKey($event)"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
    >
      <svg class="pl-string" aria-hidden="true">
        <path #chemin fill="none" [attr.stroke]="stringColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>

      @for (sl of slides; track sl.id; let i = $index) {
        <div #carte class="pl-card" [attr.data-i]="i" [attr.data-on]="i === active() ? '1' : '0'">
          <div class="pl-print">
            <div class="pl-shot">
              @if (sl.image) {
                <img [src]="sl.image" [alt]="sl.title" draggable="false" />
              }
            </div>
            <div class="pl-note">{{ sl.title }}</div>
          </div>
          <div class="pl-peg"></div>
        </div>
      }

      <div class="pl-bar">
        @for (idx of [active()]; track idx) {
          <div class="pl-cap" aria-hidden="true">
            @if (slides[idx]?.title) {
              <span class="pl-title">{{ slides[idx].title }}</span>
            }
            @if (slides[idx]?.caption) {
              <span class="pl-sub">{{ slides[idx].caption }}</span>
            }
          </div>
        }
        <span class="pl-count" aria-hidden="true"><b>{{ pad(active() + 1) }}</b> / {{ pad(slides.length) }}</span>
        <button type="button" class="pl-btn" aria-label="Précédent" (click)="step(-1)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.4" />
          </svg>
        </button>
        <button type="button" class="pl-btn" aria-label="Suivant" (click)="step(1)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" stroke-width="1.4" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .pl-root {
        --pl-ink: #0f172a;
        --pl-muted: #64748b;
        --pl-line: #cbd5e1;
        position: relative; width: 100%; overflow: hidden; background: transparent; color: var(--pl-ink);
        user-select: none; -webkit-user-select: none; touch-action: pan-y; outline: none; cursor: grab;
      }
      .pl-root[data-drag='1'] { cursor: grabbing; }
      .pl-root:focus-visible { box-shadow: inset 0 0 0 2px var(--pl-ink); }
      .pl-string { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
      .pl-card { position: absolute; left: 0; top: 0; width: var(--pl-cw); transform-origin: 50% 0; will-change: transform; cursor: inherit; }
      .pl-print {
        margin-top: 10px; background: #fbfaf7; padding: 10px 10px 0; border: 1px solid #e2e8f0;
        transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), filter 0.5s ease;
      }
      .pl-card[data-on='0'] .pl-print { transform: scale(0.9); filter: saturate(0.7) brightness(0.96); }
      .pl-shot { position: relative; aspect-ratio: 1; overflow: hidden; background: #e2e8f0; }
      .pl-shot img {
        position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; display: block;
        pointer-events: none; filter: grayscale(0.3);
      }
      .pl-note {
        height: 46px; display: flex; align-items: center; justify-content: center; padding: 0 6px;
        font: italic 400 15px/1.1 ui-serif, Georgia, 'Times New Roman', serif; color: #3b3833;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pl-peg { position: absolute; left: 50%; top: 0; width: 10px; height: 26px; margin-left: -5px; border-radius: 2px; background: #c9a67a; }
      .pl-peg::after { content: ''; position: absolute; left: 4px; top: 8px; width: 2px; height: 7px; background: rgba(80, 60, 30, 0.45); border-radius: 1px; }
      .pl-bar {
        position: absolute; left: clamp(16px, 4vw, 56px); right: clamp(16px, 4vw, 56px); bottom: clamp(20px, 4vh, 40px);
        display: flex; align-items: center; gap: clamp(12px, 2vw, 24px); cursor: default;
      }
      .pl-cap { flex: 1; min-width: 0; overflow: hidden; padding-bottom: 0.15em; }
      .pl-cap > * { display: block; animation: pl-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
      .pl-title {
        font: 700 clamp(16px, 2vw, 22px) / 1.15 ui-sans-serif, system-ui, sans-serif;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pl-sub { margin-top: 4px; font: 400 13px / 1.4 ui-sans-serif, system-ui, sans-serif; color: var(--pl-muted); }
      .pl-count { font: 500 12px / 1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.14em; color: var(--pl-muted); }
      .pl-count b { color: var(--pl-ink); font-weight: 500; }
      .pl-btn {
        appearance: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--pl-line); background: transparent;
        color: inherit; display: grid; place-items: center; cursor: pointer; transition: background 0.2s ease, color 0.2s ease;
      }
      .pl-btn:hover { background: var(--pl-ink); color: #fff; }
      .pl-btn:focus-visible { outline: 2px solid var(--pl-ink); outline-offset: 2px; }
      @keyframes pl-in { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .pl-cap > * { animation: none; } .pl-print { transition: none; } }
    `,
  ],
})
export class PolaroidLineCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() slides: SlidePassee[] = [];
  /** Hauteur de la zone, en px. */
  @Input() height = 560;
  /** Largeur d'une photo, en px (réduite sur petit écran). */
  @Input() cardWidth = 260;
  /** Affaissement de la corde au milieu, en px. */
  @Input() sag = 40;
  /** Amplitude du balancement ; 0 les fige. */
  @Input() swing = 1;
  /** ms par photo ; 0 désactive le défilement automatique. */
  @Input() autoplay = 5000;
  @Input() stringColor = '#94a3b8';

  @ViewChild('racine', { static: true }) racine!: ElementRef<HTMLElement>;
  @ViewChild('chemin', { static: true }) chemin!: ElementRef<SVGPathElement>;
  @ViewChildren('carte') cartes!: QueryList<ElementRef<HTMLElement>>;

  active = signal(0);
  dragging = signal(false);
  cw = signal(260);

  private S = { off: 0, vel: 0, target: 0, a: [] as number[], w: [] as number[] };
  private drag: { x: number; off: number; lx: number; lt: number; v: number; moved: boolean } | null = null;
  private lastTouch = 0;
  private activeRef = 0;
  private size = { w: 1200, h: 560, cw: 260 };
  private raf = 0;
  private visible = true;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private minuterie?: number;

  constructor(private zone: NgZone, private router: Router) {}

  private get spacing(): number {
    return this.size.cw * 1.08;
  }

  private get total(): number {
    return this.slides.length;
  }

  pad(n: number): string {
    return pad2(n);
  }

  private goTo(i: number) {
    this.S.target = clamp(i, 0, Math.max(0, this.total - 1)) * this.spacing;
  }

  ngAfterViewInit() {
    const root = this.racine.nativeElement;
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => {
        const r = root.getBoundingClientRect();
        const cw = Math.round(Math.max(150, Math.min(this.cardWidth, r.width * 0.42, r.height * 0.42)));
        this.size = { w: r.width, h: r.height, cw };
        this.zone.run(() => this.cw.set(cw));
        // on garde la photo active au centre quand l'espacement change
        this.S.target = this.activeRef * this.spacing;
        this.S.off = this.activeRef * this.spacing;
      });
      this.ro.observe(root);

      const reduire = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let prev = performance.now();

      const frame = (now: number) => {
        this.raf = 0;
        if (!this.visible) return;
        const n = this.total;
        if (!n) {
          this.raf = requestAnimationFrame(frame);
          return;
        }
        const S = this.S;
        const dt = Math.min(0.033, (now - prev) / 1000);
        prev = now;
        const { w, h, cw } = this.size;
        const spacing = this.spacing;
        const y0 = Math.max(40, h * 0.2);
        const d = this.drag;
        let lineVel: number;
        if (d && d.moved) {
          lineVel = d.v * 1000;
        } else {
          const avant = S.off;
          const [off, vel] = springStep(S.off, S.vel, S.target, dt);
          S.off = off;
          S.vel = vel;
          lineVel = -(S.off - avant) / Math.max(dt, 1e-3);
        }
        const g = reduire ? 0 : this.swing;
        const near = nearestAt(S.off, spacing, n);
        const els = this.cartes.toArray();
        for (let i = 0; i < n; i++) {
          const el = els[i]?.nativeElement;
          if (!el) continue;
          const x = w / 2 + i * spacing - S.off;
          if (x < -cw * 1.5 || x > w + cw * 1.5) {
            el.style.visibility = 'hidden';
            continue;
          }
          el.style.visibility = 'visible';
          let a = S.a[i] || 0;
          let av = S.w[i] || 0;
          [a, av] = swingStep(a, av, lineVel, dt, g);
          if (g) a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * g;
          S.a[i] = a;
          S.w[i] = av;
          const y = stringY(x, w, y0, this.sag) - 6;
          el.style.transform = `translate(${(x - cw / 2).toFixed(1)}px,${y.toFixed(1)}px) rotate(${a.toFixed(4)}rad)`;
          el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
        }
        this.chemin.nativeElement.setAttribute('d', `M0 ${y0} Q${w / 2} ${y0 + 2 * this.sag} ${w} ${y0}`);
        if (near !== this.activeRef) {
          this.activeRef = near;
          this.zone.run(() => this.active.set(near));
        }
        this.raf = requestAnimationFrame(frame);
      };

      // La simulation s'arrête quand le carrousel n'est pas visible à l'écran
      this.io = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible && !this.raf) {
          prev = performance.now();
          this.raf = requestAnimationFrame(frame);
        }
      });
      this.io.observe(root);
      this.raf = requestAnimationFrame(frame);

      // Défilement automatique, retour à la première photo après la dernière
      if (this.autoplay > 0) {
        this.minuterie = window.setInterval(() => {
          if (this.total < 2 || document.hidden || this.drag || performance.now() - this.lastTouch < this.autoplay) return;
          this.goTo(this.activeRef >= this.total - 1 ? 0 : this.activeRef + 1);
        }, this.autoplay);
      }
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
    if (this.minuterie) clearInterval(this.minuterie);
  }

  onDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.pl-bar')) return;
    this.lastTouch = performance.now();
    this.drag = { x: e.clientX, off: this.S.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  }

  onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      this.dragging.set(true);
      this.racine.nativeElement.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v;
    d.lx = e.clientX;
    d.lt = e.timeStamp;
    const max = (this.total - 1) * this.spacing;
    let off = d.off - dx;
    if (off < 0) off *= 0.35;
    if (off > max) off = max + (off - max) * 0.35;
    this.S.off = off;
  }

  onUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    this.lastTouch = performance.now();
    if (!d) return;
    if (d.moved) {
      this.dragging.set(false);
      this.S.vel = -d.v * 1000;
      this.goTo(nearestAt(this.S.off - d.v * 180, this.spacing, this.total));
      return;
    }
    // simple clic : une photo du côté vient au centre ; celle du centre ouvre la fiche de l'événement
    const carte = (e.target as HTMLElement).closest('[data-i]');
    if (!carte) return;
    const i = Number(carte.getAttribute('data-i'));
    if (i === this.activeRef) {
      const slide = this.slides[i];
      if (slide) this.zone.run(() => this.router.navigate(['/evenements', slide.id]));
    } else {
      this.goTo(i);
    }
  }

  step(dir: number) {
    this.lastTouch = performance.now();
    this.goTo(clamp(this.activeRef + dir, 0, this.total - 1));
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
    else return;
    e.preventDefault();
  }
}
