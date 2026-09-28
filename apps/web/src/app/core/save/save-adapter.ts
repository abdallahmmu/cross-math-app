import type { SaveData } from './save-schema';

/**
 * Where progress lives. `LocalSaveAdapter` is the only implementation today; an
 * `ApiSaveAdapter` will sit behind the same interface once accounts exist, so
 * no caller needs to know whether a save is local or in the cloud.
 *
 * An abstract class rather than an interface so it doubles as the DI token.
 */
export abstract class SaveAdapter {
  /** `null` when there is nothing stored yet, or storage is unreadable. */
  abstract load(): SaveData | null;
  abstract save(data: SaveData): void;
  abstract clear(): void;
  /** False when writes are being dropped, so the UI can say so. */
  abstract get writable(): boolean;
}
