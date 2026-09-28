import { Injectable, signal } from '@angular/core';
import type { IconName } from './nb-icon';

export type ToastTone = 'ink' | 'mint' | 'error';

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
  readonly icon: IconName | null;
}

const VISIBLE_MS = 2400;

/** Short, non-blocking feedback: coins earned, a purchase, a blocked action. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<readonly Toast[]>([]);

  readonly toasts = this.items.asReadonly();

  show(text: string, options: { tone?: ToastTone; icon?: IconName } = {}): void {
    const toast: Toast = {
      id: this.nextId,
      text,
      tone: options.tone ?? 'ink',
      icon: options.icon ?? null,
    };
    this.nextId += 1;
    this.items.update((current) => [...current, toast]);
    setTimeout(() => this.dismiss(toast.id), VISIBLE_MS);
  }

  dismiss(id: number): void {
    this.items.update((current) => current.filter((toast) => toast.id !== id));
  }
}
