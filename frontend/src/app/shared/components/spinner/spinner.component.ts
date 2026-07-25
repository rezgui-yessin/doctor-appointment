import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-wrap" [style.padding]="inline ? '0' : '2.5rem 0'">
      <svg class="ring" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--line)" stroke-width="3"></circle>
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--sage)" stroke-width="3"
                stroke-dasharray="18 51" stroke-linecap="round"></circle>
      </svg>
      <span *ngIf="label" class="label">{{ label }}</span>
    </div>
  `,
  styles: [`
    .spinner-wrap { display: flex; align-items: center; justify-content: center; gap: 0.6rem; }
    .ring { animation: spin 0.9s linear infinite; }
    .label { font-size: 0.85rem; color: var(--slate); }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SpinnerComponent {
  @Input() label = '';
  @Input() inline = false;
}
