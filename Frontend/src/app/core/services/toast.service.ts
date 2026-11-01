import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<ToastMessage | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(message: string, type: ToastType = 'success'): void {
    if (this.timer) clearTimeout(this.timer);
    this.toast.set({ message, type });
    this.timer = setTimeout(() => this.toast.set(null), 4500);
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer);
    this.toast.set(null);
  }
}
