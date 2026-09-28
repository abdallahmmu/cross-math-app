import { Injectable } from '@angular/core';
import { SaveAdapter } from './save-adapter';
import { migrate, type SaveData } from './save-schema';

const STORAGE_KEY = 'sumday.save';

/**
 * localStorage, defensively.
 *
 * Private browsing, a full quota and disabled storage all throw on access
 * rather than returning null, so every call is wrapped. When storage turns out
 * to be unusable the game keeps running from memory - it just will not survive
 * a reload.
 */
@Injectable()
export class LocalSaveAdapter extends SaveAdapter {
  private failed = false;

  override get writable(): boolean {
    return !this.failed;
  }

  override load(): SaveData | null {
    const raw = this.read();
    if (raw === null) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch {
      // Corrupt JSON: start fresh rather than trapping the player on a broken save.
      return null;
    }
  }

  override save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.failed = false;
    } catch {
      this.failed = true;
    }
  }

  override clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      this.failed = true;
    }
  }

  private read(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      this.failed = true;
      return null;
    }
  }
}
