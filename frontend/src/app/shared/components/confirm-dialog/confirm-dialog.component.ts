import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" *ngIf="open" (click)="cancelled.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="actions">
          <button class="btn btn-ghost" (click)="cancelled.emit()">{{ cancelLabel }}</button>
          <button class="btn" [class.btn-danger]="danger" [class.btn-primary]="!danger" (click)="confirmed.emit()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; background: rgba(24, 35, 56, 0.45);
      display: flex; align-items: center; justify-content: center; z-index: 200;
      animation: fade 0.15s ease-out;
    }
    .sheet {
      background: var(--paper-raised); border-radius: var(--radius-lg);
      padding: 1.75rem; width: 100%; max-width: 380px;
      box-shadow: var(--shadow-raised); border: 1px solid var(--line);
    }
    .sheet p { color: var(--slate); font-size: 0.9rem; }
    .actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.25rem; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
