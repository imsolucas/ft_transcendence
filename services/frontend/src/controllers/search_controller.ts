// Stimulus controller for search functionality
import { Controller } from '@hotwired/stimulus';

export default class SearchController extends Controller {
  static targets = ['input', 'results', 'container'];
  static values = {
    searchQuery: { type: String, default: '' },
    showResults: { type: Boolean, default: false }
  };

  declare inputTarget: HTMLInputElement;
  declare resultsTarget: HTMLElement;
  declare containerTarget: HTMLElement;
  declare searchQueryValue: string;
  declare showResultsValue: boolean;

  private outsideClickHandler?: (event: MouseEvent) => void;
  private performSearchCallback?: () => Promise<void>;

  connect() {
    // Initialize results as hidden
    this.updateResultsVisibility();
    // Set up outside click handler
    this.setupOutsideClickHandler();
    // Set up input event listener for two-way binding
    this.setupInputListener();
  }

  disconnect() {
    // Clean up event listeners
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
  }

  // Set callback function for performing search (set from parent component)
  setPerformSearchCallback(callback: () => Promise<void>) {
    this.performSearchCallback = callback;
  }

  async performSearch() {
    if (this.performSearchCallback) {
      await this.performSearchCallback();
    }
  }

  toggleResults() {
    this.showResultsValue = !this.showResultsValue;
    this.updateResultsVisibility();
  }

  closeResults() {
    this.showResultsValue = false;
    this.updateResultsVisibility();
  }

  searchQueryValueChanged() {
    // Update input value when searchQueryValue changes
    if (this.hasInputTarget && this.inputTarget.value !== this.searchQueryValue) {
      this.inputTarget.value = this.searchQueryValue;
    }
  }

  showResultsValueChanged() {
    this.updateResultsVisibility();
  }

  private updateResultsVisibility() {
    if (this.hasResultsTarget) {
      if (this.showResultsValue) {
        this.resultsTarget.classList.remove('hidden');
        this.resultsTarget.classList.add('block');
      } else {
        this.resultsTarget.classList.remove('block');
        this.resultsTarget.classList.add('hidden');
      }
    }
  }

  private setupOutsideClickHandler() {
    this.outsideClickHandler = (event: MouseEvent) => {
      if (this.showResultsValue && !this.element.contains(event.target as Node)) {
        this.closeResults();
      }
    };
    document.addEventListener('click', this.outsideClickHandler);
  }

  private setupInputListener() {
    if (this.hasInputTarget) {
      this.inputTarget.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        this.searchQueryValue = target.value;
      });
    }
  }
}

