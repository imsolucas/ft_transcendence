// Stimulus controller for modal functionality
import { Controller } from '@hotwired/stimulus';

export default class ModalController extends Controller {
  static targets = ['backdrop', 'container'];
  static values = {
    open: { type: Boolean, default: true }
  };

  declare backdropTarget: HTMLElement;
  declare containerTarget: HTMLElement;
  declare openValue: boolean;

  connect() {
    // Initialize modal visibility
    this.updateModalVisibility();
    // Add escape key handler
    this.setupEscapeKeyHandler();
  }

  disconnect() {
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  open() {
    this.openValue = true;
    this.updateModalVisibility();
  }

  close(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.openValue = false;
    this.updateModalVisibility();
    
    // Call onClose callback if available
    const onClose = (this.element as any)._onClose;
    
    // Remove modal from DOM after transition
    setTimeout(() => {
      if (!this.openValue) {
        if (onClose) {
          onClose();
        }
        this.element.remove();
      }
    }, 200);
  }

  closeOnBackdrop(event: MouseEvent) {
    // Only close if clicking directly on backdrop, not container
    if (event.target === this.backdropTarget) {
      this.close(event);
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  openValueChanged() {
    this.updateModalVisibility();
  }

  private updateModalVisibility() {
    if (this.openValue) {
      this.element.classList.remove('hidden');
      this.element.style.display = 'flex';
    } else {
      // Start transition to hidden
      this.element.style.opacity = '0';
      setTimeout(() => {
        this.element.classList.add('hidden');
        this.element.style.display = 'none';
      }, 150);
    }
  }

  private handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.openValue) {
      this.close();
    }
  };

  private setupEscapeKeyHandler() {
    document.addEventListener('keydown', this.handleEscapeKey);
  }
}

