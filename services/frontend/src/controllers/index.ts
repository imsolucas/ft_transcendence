// Controller registration file for Stimulus
import { Application } from '@hotwired/stimulus';
import DropdownController from './dropdown_controller';
import ModalController from './modal_controller';
import SearchController from './search_controller';

// Initialize Stimulus application
export const application = Application.start();

// Make application globally accessible for helper functions
declare global {
  interface Window {
    Stimulus?: {
      application: Application;
    };
  }
}
window.Stimulus = { application };

// Register all controllers
application.register('dropdown', DropdownController);
application.register('modal', ModalController);
application.register('search', SearchController);

// Export application for use in main.ts
export default application;

