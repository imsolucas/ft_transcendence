// Stimulus controller for dropdown functionality
import { Controller } from '@hotwired/stimulus';

export default class DropdownController extends Controller {
  static targets = ['menu', 'trigger'];
  static values = {
    open: { type: Boolean, default: false }
  };

  declare menuTarget: HTMLElement;
  declare triggerTarget: HTMLElement;
  declare openValue: boolean;

  private outsideClickHandler?: (event: MouseEvent) => void;

  connect() {
    // Initialize menu as hidden
    this.updateMenuVisibility();
    // Set up outside click handler
    this.setupOutsideClickHandler();
  }

  disconnect() {
    // Clean up event listeners
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
  }

  toggle(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.openValue = !this.openValue;
    this.updateMenuVisibility();
  }

  close(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.openValue = false;
    this.updateMenuVisibility();
  }

  openValueChanged() {
    this.updateMenuVisibility();
  }

  private updateMenuVisibility() {
    if (this.hasMenuTarget) {
      if (this.openValue) {
        // Show menu with transition
        this.menuTarget.classList.remove('hidden', 'opacity-0', 'scale-95');
        this.menuTarget.classList.add('block', 'opacity-100', 'scale-100');
      } else {
        // Hide menu with transition
        this.menuTarget.classList.remove('opacity-100', 'scale-100');
        this.menuTarget.classList.add('opacity-0', 'scale-95');
        // Remove from display after transition
        setTimeout(() => {
          if (!this.openValue) {
            this.menuTarget.classList.remove('block');
            this.menuTarget.classList.add('hidden');
          }
        }, 100);
      }
    }
  }

  private setupOutsideClickHandler() {
    this.outsideClickHandler = (event: MouseEvent) => {
      if (this.openValue && !this.element.contains(event.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('click', this.outsideClickHandler);
  }
}

