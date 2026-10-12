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
  | 'bar-chart-2'
  | 'bar-chart-3'
  | 'rocket'
  | 'message-circle'
  | 'star'
  | 'download'
  | 'phone'
  | 'bell'
  | 'settings'
  | 'printer'
  | 'message-square'
  | 'file-text'
  | 'key'
  | 'check'
  | 'info'
  | 'mail'
  | 'dollar-sign'
  | 'shield-alert'
  | 'eye'
  | 'shield'
  | 'building'
  | 'briefcase'
  | 'plus-circle'
  | 'layout-dashboard'
  | 'tags'
  | 'share-2'
  | 'smartphone'
  | 'megaphone'
  | 'headphones'
  | 'wave'
  | 'refresh-cw'
  | 'rotate-cw'
  | 'credit-card'
  | 'user'
  | 'percent'
  | 'chevron-down'
  | 'image'
  | 'plus'
  | 'x'
  | 'pencil'
  | 'trash'
  | 'clock'
  | 'send'
  | 'ban'
  | 'rotate-ccw'
  | 'alert-triangle'
  | 'wifi-off'
  | 'log-out'
  | 'door-open'
  | 'loader-2'
  | 'users'
  | 'copy'
  | 'play'
  | 'heart'
  | 'help-circle'
  | 'shopping-bag'
  | 'edit-3';

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
        @case ('bar-chart-2') {
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-8" />
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
        @case ('message-square') {
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        }
        @case ('file-text') {
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        }
        @case ('key') {
          <circle cx="7.5" cy="15.5" r="3.5" />
          <path d="M10.5 15.5h10v-3h-3.5" />
          <path d="m14 15.5 6-6" />
          <path d="M11 12.5 13.5 10" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 2" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        }
        @case ('mail') {
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />
          <path d="m22 7-10 7-10-7" />
        }
        @case ('dollar-sign') {
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        }
        @case ('shield-alert') {
          <path d="M12 3 5 6v6c0 5 3.5 8.8 7 10 3.5-1.2 7-5 7-10V6l-7-3Z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('shield') {
          <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z" />
        }
        @case ('building') {
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 9h.01M9 13h.01M13 9h.01M13 13h.01" />
        }
        @case ('briefcase') {
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 11h18" />
        }
        @case ('plus-circle') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        }
        @case ('layout-dashboard') {
          <path d="M4 13h7V4H4z" />
          <path d="M13 20h7v-7h-7z" />
          <path d="M13 4h7v5h-7z" />
          <path d="M4 20h7v-5H4z" />
        }
        @case ('tags') {
          <path d="m12 2 9 9-9 9-9-9 9-9Z" />
          <path d="M9 9h.01" />
        }
        @case ('share-2') {
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 11 6.8-4.3" />
          <path d="m8.6 13 6.8 4.3" />
        }
        @case ('smartphone') {
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18h2" />
        }
        @case ('megaphone') {
          <path d="M3 11v2l12 4 6-2V9l-6-2-12 4Z" />
          <path d="M3 13v5a2 2 0 0 0 2 2h2" />
        }
        @case ('headphones') {
          <path d="M4 12a8 8 0 0 1 16 0v7a2 2 0 0 1-2 2h-2v-8h4" />
          <path d="M4 19a2 2 0 0 1 2-2h2v8H6a2 2 0 0 1-2-2z" />
        }
        @case ('wave') {
          <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
          <path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
        }
        @case ('refresh-cw') {
          <path d="M21 12a9 9 0 1 1-3.27-6.73" />
          <path d="M21 4v5h-5" />
        }
        @case ('rotate-cw') {
          <path d="M3 12a9 9 0 0 0 15.55 5.55" />
          <path d="M21 4v7h-7" />
        }
        @case ('credit-card') {
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        }
        @case ('user') {
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        }
        @case ('percent') {
          <path d="m19 5-14 14" />
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
        }
        @case ('star') {
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9.8 18.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9.8 5.6a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 14.2 5.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.38.24.85.24 1.23 0H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        }
        @case ('printer') {
          <path d="M6 9V3h12v6" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v7H6z" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.5-3.5a2 2 0 0 0-2.83 0L5 21" />
        }
        @case ('plus') {
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        }
        @case ('x') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('pencil') {
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        }
        @case ('trash') {
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        }
        @case ('send') {
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
        }
        @case ('ban') {
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 14.14 14.14" />
        }
        @case ('rotate-ccw') {
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v7h7" />
        }
        @case ('alert-triangle') {
          <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4.24 21h15.52a2 2 0 0 0 1.97-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        }
        @case ('wifi-off') {
          <path d="M2 6.5A16.7 16.7 0 0 1 12 3a16.7 16.7 0 0 1 10 3.5" />
          <path d="M5 11.5A11.3 11.3 0 0 1 19 11.5" />
          <path d="M8.5 16.5A6.5 6.5 0 0 1 15.5 16.5" />
          <path d="M9 21h6" />
          <path d="M2 2 22 22" />
        }
        @case ('log-out') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('door-open') {
          <path d="M3 21h18" />
          <path d="M7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
          <path d="M10 11h.01" />
          <path d="M14 11h.01" />
        }
        @case ('loader-2') {
          <path d="M21 12a9 9 0 1 1-9-9" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" />
          <path d="M16.24 7.76l2.83-2.83" />
        }
        @case ('users') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('copy') {
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        }
        @case ('play') {
          <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
        }
        @case ('heart') {
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" [attr.fill]="filled ? 'currentColor' : 'none'" />
        }
        @case ('help-circle') {
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 1 1 5.82 1c-2 2-3 2.5-3 4" />
          <path d="M12 17h.01" />
        }
        @case ('shopping-bag') {
          <path d="M6 8h12l-1 11H7L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        }
        @case ('edit-3') {
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
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
