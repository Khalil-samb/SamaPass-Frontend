import { Component, Input } from '@angular/core';

export type IconName =
  | 'ticket'
  | 'search'
  | 'calendar'
  | 'circle-user-round'
  | 'lock'
  | 'tag'
  | 'check-circle-2'
  | 'zap'
  | 'qr-code'
  | 'map-pin'
  | 'arrow-right'
  | 'bookmark'
  | 'shield-check'
  | 'share'
  | 'wallet'
  | 'trending-up'
  | 'bar-chart-3'
  | 'rocket'
  | 'message-circle'
  | 'star'
  | 'download'
  | 'phone'
  | 'plus-circle'
  | 'layout-dashboard'
  | 'tags'
  | 'share-2'
  | 'smartphone'
  | 'megaphone'
  | 'headphones'
  | 'x'
  | 'mail'
  | 'eye'
  | 'shield'
  | 'building'
  | 'briefcase'
  | 'chevron-down'
  | 'image'
  | 'check'
  | 'refresh-cw'
  | 'credit-card'
  | 'user'
  | 'percent'
  | 'info'
  | 'file-text'
  | 'message-square'
  | 'key'
  | 'printer'
  | 'wave';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      [attr.fill]="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name) {
        @case ('ticket') {
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        }
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        }
        @case ('circle-user-round') {
          <path d="M18 20a6 6 0 0 0-12 0" />
          <circle cx="12" cy="10" r="4" />
          <circle cx="12" cy="12" r="10" />
        }
        @case ('lock') {
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        }
        @case ('tag') {
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        }
        @case ('check-circle-2') {
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('zap') {
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        }
        @case ('qr-code') {
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3v3" />
          <path d="M21 14v.01" />
          <path d="M14 21v-3" />
          <path d="M18 21h3" />
          <path d="M21 18v.01" />
        }
        @case ('map-pin') {
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('arrow-right') {
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        }
        @case ('bookmark') {
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        }
        @case ('shield-check') {
          <path d="M20 13c0 5-3.5 7.5-7.35 8.83a1 1 0 0 1-.6-.03C8.06 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('share') {
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        }
        @case ('wallet') {
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        }
        @case ('trending-up') {
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        }
        @case ('bar-chart-3') {
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        }
        @case ('rocket') {
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        }
        @case ('message-circle') {
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        }
        @case ('star') {
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        }
        @case ('x') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('shield') {
          <path d="M12 3 5 6v6c0 5 3.5 8.5 7 9.5 3.5-1 7-4.5 7-9.5V6z" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('building') {
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 21v-4h6v4" />
          <path d="M9 7h.01" />
          <path d="M15 7h.01" />
          <path d="M9 11h.01" />
          <path d="M15 11h.01" />
        }
        @case ('briefcase') {
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M3 12h18" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('image') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 15-5.2-5.2a2 2 0 0 0-2.8 0L7 17" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 2" />
        }
        @case ('refresh-cw') {
          <path d="M3 12a9 9 0 0 1 15.39-4.72" />
          <path d="M21 12a9 9 0 0 1-15.39 4.72" />
          <path d="M3 4v5h5" />
          <path d="M21 20v-5h-5" />
        }
        @case ('credit-card') {
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M7 15h2" />
          <path d="M12 15h4" />
        }
        @case ('user') {
          <path d="M19 21a7 7 0 0 0-14 0" />
          <circle cx="12" cy="7" r="4" />
        }
        @case ('percent') {
          <path d="M19 5 5 19" />
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        }
        @case ('file-text') {
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        }
        @case ('message-square') {
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        }
        @case ('key') {
          <circle cx="8" cy="15" r="3" />
          <path d="M11 15h10" />
          <path d="M18 12v6" />
        }
        @case ('printer') {
          <path d="M6 9V3h12v6" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v7H6z" />
          <path d="M9 18h6" />
        }
        @case ('wave') {
          <path d="M2 12c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" />
          <path d="M2 16c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        }
        @case ('plus-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10" />
          <path d="M7 12h10" />
        }
        @case ('layout-dashboard') {
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="4" rx="1" />
          <rect x="14" y="11" width="7" height="10" rx="1" />
          <rect x="3" y="12" width="7" height="9" rx="1" />
        }
        @case ('tags') {
          <path d="M9 3H4a1 1 0 0 0-1 1v5l7.5 7.5a2 2 0 0 0 2.8 0l4.7-4.7a2 2 0 0 0 0-2.8L9 3Z" />
          <path d="M7.5 7.5h.01" />
        }
        @case ('share-2') {
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 11.2 15.4 7.8" />
          <path d="M8.6 12.8 15.4 16.2" />
        }
        @case ('smartphone') {
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 18h2" />
        }
        @case ('megaphone') {
          <path d="M4 12V6l12-3v12l-12-3Z" />
          <path d="M4 12v6a2 2 0 0 0 2 2h1" />
          <path d="M16 9h3a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-3" />
        }
        @case ('headphones') {
          <path d="M4 13a8 8 0 0 1 16 0" />
          <rect x="2" y="13" width="4" height="7" rx="2" />
          <rect x="18" y="13" width="4" height="7" rx="2" />
        }
        @case ('x') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('shield') {
          <path d="M12 3 5 6v6c0 5 3.5 8.5 7 9.5 3.5-1 7-4.5 7-9.5V6z" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('building') {
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 21v-4h6v4" />
          <path d="M9 7h.01" />
          <path d="M15 7h.01" />
          <path d="M9 11h.01" />
          <path d="M15 11h.01" />
        }
        @case ('briefcase') {
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M3 12h18" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('image') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 15-5.2-5.2a2 2 0 0 0-2.8 0L7 17" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 2" />
        }
        @case ('refresh-cw') {
          <path d="M3 12a9 9 0 0 1 15.39-4.72" />
          <path d="M21 12a9 9 0 0 1-15.39 4.72" />
          <path d="M3 4v5h5" />
          <path d="M21 20v-5h-5" />
        }
        @case ('credit-card') {
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M7 15h2" />
          <path d="M12 15h4" />
        }
        @case ('user') {
          <path d="M19 21a7 7 0 0 0-14 0" />
          <circle cx="12" cy="7" r="4" />
        }
        @case ('percent') {
          <path d="M19 5 5 19" />
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        }
        @case ('file-text') {
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        }
        @case ('message-square') {
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        }
        @case ('key') {
          <circle cx="8" cy="15" r="3" />
          <path d="M11 15h10" />
          <path d="M18 12v6" />
        }
        @case ('printer') {
          <path d="M6 9V3h12v6" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v7H6z" />
          <path d="M9 18h6" />
        }
        @case ('wave') {
          <path d="M2 12c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" />
          <path d="M2 16c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
  @Input() filled = false;
}
