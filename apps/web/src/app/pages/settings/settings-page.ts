import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SaveAdapter } from '../../core/save/save-adapter';
import { SoundService } from '../../core/sound/sound.service';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbCard } from '../../ui/nb-card';
import { NbModal } from '../../ui/nb-modal';
import { NbTopBar } from '../../ui/nb-top-bar';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbButton, NbCard, NbModal, NbTopBar],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly progress = inject(ProgressStore);
  private readonly saves = inject(SaveAdapter);
  private readonly sound = inject(SoundService);
  private readonly toasts = inject(ToastService);

  protected readonly confirmingReset = signal(false);
  protected readonly storageWritable = this.saves.writable;

  protected toggleSound(): void {
    this.progress.setSound(!this.progress.sound());
    // Play it after turning it on, so the switch confirms itself.
    this.sound.play('toggle');
  }

  protected resetProgress(): void {
    this.progress.resetProgress();
    this.confirmingReset.set(false);
    this.toasts.show('Progress reset', { tone: 'mint' });
  }
}
