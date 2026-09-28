import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SaveAdapter } from '../../core/save/save-adapter';
import { findTheme } from '../../core/config/themes';
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
  imports: [NbBadge, NbButton, NbCard, NbModal, NbTopBar, RouterLink],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly progress = inject(ProgressStore);
  private readonly saves = inject(SaveAdapter);
  private readonly toasts = inject(ToastService);

  protected readonly confirmingReset = signal(false);
  protected readonly storageWritable = this.saves.writable;
  protected readonly themeName = (): string => findTheme(this.progress.activeTheme()).name;

  protected toggleSound(): void {
    this.progress.setSound(!this.progress.sound());
  }

  protected resetProgress(): void {
    this.progress.resetProgress();
    this.confirmingReset.set(false);
    this.toasts.show('Progress reset', { tone: 'mint' });
  }
}
