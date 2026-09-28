import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A centred modal, or a sheet that rises from the bottom edge on phones.
 *
 * Dismissal is reported, never performed: the parent owns whether the dialog is
 * in the DOM, which keeps the win modal (not dismissible) and the hint sheet
 * (dismissible) on the same component.
 */
@Component({
  selector: 'nb-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-modal]': `variant() === 'modal'`,
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="backdrop" (click)="onBackdrop()"></div>
    <div
      #panel
      class="panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-label]="label()"
    >
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: var(--space-3);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--ink) 55%, transparent);
      animation: nb-fade-in var(--dur) var(--ease-out);
    }
    .panel {
      position: relative;
      width: 100%;
      max-width: var(--content-max);
      max-height: calc(100dvh - var(--space-6));
      overflow-y: auto;
      padding: var(--space-5);
      border: var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow-lg);
      animation: nb-sheet-up var(--dur-slow) var(--ease-out);
    }
    .panel:focus {
      outline: none;
    }
    :host(.is-modal) {
      align-items: center;
    }
    :host(.is-modal) .panel {
      animation: nb-rise var(--dur-slow) var(--ease-spring);
    }
    /* On anything wider than a phone a sheet becomes a centred dialog too. */
    @media (min-width: 480px) {
      :host {
        align-items: center;
      }
      .panel {
        animation: nb-rise var(--dur-slow) var(--ease-spring);
      }
    }
  `,
})
export class NbModal {
  readonly label = input.required<string>();
  readonly variant = input<'sheet' | 'modal'>('sheet');
  /** When false, the backdrop and Escape do nothing. */
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly dismiss = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);

  constructor() {
    // The page behind a dialog must not scroll away under it.
    const body = this.document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      body.style.overflow = previousOverflow;
    });

    afterNextRender(() => {
      const panel = this.panel().nativeElement;
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    });
  }

  protected onBackdrop(): void {
    if (this.dismissible()) this.dismiss.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.dismissible()) {
        event.stopPropagation();
        this.dismiss.emit();
      }
      return;
    }
    if (event.key !== 'Tab') return;

    // Keep focus inside the dialog.
    const focusable = [...this.panel().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) return;

    const active = this.document.activeElement;
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (active === first || active === this.panel().nativeElement)) {
      event.preventDefault();
      last.focus();
    }
  }
}
