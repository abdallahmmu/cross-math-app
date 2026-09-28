import { Injectable } from '@angular/core';

export interface PurchaseProduct {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly price: string;
}

export type PurchaseResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'unavailable' | 'cancelled' };

/**
 * Real-money purchases. Nothing can be bought in the web build; the products
 * are listed and disabled so the shop has its final shape before the mobile
 * release wires up in-app purchases.
 */
export abstract class PurchaseService {
  abstract readonly available: boolean;
  abstract readonly unavailableReason: string;
  abstract readonly products: readonly PurchaseProduct[];
  abstract buy(productId: string): Promise<PurchaseResult>;
}

@Injectable()
export class UnavailablePurchaseService extends PurchaseService {
  override readonly available = false;
  override readonly unavailableReason = 'Coming with the mobile app';

  override readonly products: readonly PurchaseProduct[] = [
    { id: 'remove-ads', title: 'Remove ads', detail: 'Keep the free hints, lose the videos.', price: '$2.99' },
    { id: 'coins-small', title: 'Pocket of coins', detail: '500 coins', price: '$0.99' },
    { id: 'coins-medium', title: 'Jar of coins', detail: '1,500 coins', price: '$2.49' },
    { id: 'coins-large', title: 'Vault of coins', detail: '5,000 coins', price: '$6.99' },
  ];

  override buy(): Promise<PurchaseResult> {
    return Promise.resolve({ ok: false, reason: 'unavailable' });
  }
}
