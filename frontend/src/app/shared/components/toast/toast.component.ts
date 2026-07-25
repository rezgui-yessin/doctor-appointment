import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      <div *ngFor="let m of toast.messages()" class="toast" [class]="'toast-' + m.kind" (click)="toast.dismiss(m.id)">
        <span class="dot"></span>
        <span class="text">{{ m.text }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      z-index: 100;
      max-width: 340px;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-left: 3px solid var(--slate);
      border-radius: var(--radius-sm);
      padding: 0.75rem 0.9rem;
      box-shadow: var(--shadow-raised);
      font-size: 0.85rem;
      cursor: pointer;
      animation: slide-in 0.18s ease-out;
    }
    .toast-success { border-left-color: var(--sage); }
    .toast-error { border-left-color: var(--brick); }
    .toast-info { border-left-color: var(--amber); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-top: 0.4rem; flex-shrink: 0; }
    .toast-success .dot { color: var(--sage); }
    .toast-error .dot { color: var(--brick); }
    .toast-info .dot { color: var(--amber); }
    @keyframes slide-in {
      from { transform: translateX(12px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
})
export class ToastComponent {
  constructor(public toast: ToastService) {}
}
