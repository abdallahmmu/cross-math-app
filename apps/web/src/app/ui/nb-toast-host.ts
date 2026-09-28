import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NbIcon } from './nb-icon';
import { ToastService } from './toast.service';

/** Renders whatever `ToastService` is holding. Mounted once, in the shell. */
@Component({
  selector: 'nb-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbIcon],
  host: { 'aria-live': 'polite', 'aria-atomic': 'false' },
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div class="toast" [class]="'tone-' + toast.tone">
        @if (toast.icon !== null) {
          <nb-icon [name]="toast.icon" />
        }
        <span>{{ toast.text }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: calc(var(--top-bar-height) + var(--space-2));
      left: 50%;
      transform: translateX(-50%);
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      align-items: center;
      width: max-content;
      max-width: calc(100vw - var(--space-5));
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border: var(--border);
      border-radius: var(--radius-pill);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--text-sm);
      animation: nb-toast-in var(--dur) var(--ease-spring);
      --icon-size: 1.1rem;
    }
    .toast.tone-ink {
      background: var(--sunflower);
      color: var(--on-accent);
    }
    .toast.tone-mint {
      background: var(--mint);
      color: var(--on-accent);
    }
    .toast.tone-error {
      background: var(--paper);
      border-color: var(--error);
      color: var(--error-ink);
    }
  `,
})
export class NbToastHost {
  protected readonly toasts = inject(ToastService);
}
