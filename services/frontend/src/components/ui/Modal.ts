// components/ui/Modal.ts

interface ModalOptions {
  title: string;
  content: HTMLElement | string;
  onClose?: () => void;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  title,
  content,
  onClose,
  showCloseButton = true,
  size = 'md',
}: ModalOptions): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center';
  // Don't set display:none for modals - they should be visible by default
  
  // Add Alpine.js directive for reactive state (framework usage)
  modal.setAttribute('x-data', "{ open: true }");
  modal.setAttribute('x-show', 'open');
  modal.setAttribute('x-transition', '');
  
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-black/50 backdrop-blur-sm';
  
  // Use event listener for backdrop click (Alpine.js can't access closure variables)
  backdrop.addEventListener('click', () => {
    // Update Alpine.js state if available
    if (window.Alpine && modal.__x) {
      modal.__x.$data.open = false;
      // Wait for transition, then remove
      setTimeout(() => {
        if (onClose) onClose();
        modal.remove();
      }, 200);
    } else {
      // Fallback: remove immediately
      if (onClose) onClose();
      modal.remove();
    }
  });
  
  // Modal content container
  const container = document.createElement('div');
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };
  container.className = `relative ${sizeClasses[size]} w-full mx-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700`;
  container.setAttribute('@click.stop', '');
  
  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between p-6 border-b border-gray-700';
  
  const titleEl = document.createElement('h2');
  titleEl.className = 'text-xl font-semibold text-white';
  titleEl.textContent = title;
  header.appendChild(titleEl);
  
  if (showCloseButton) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'text-gray-400 hover:text-white text-3xl leading-none transition-colors';
    
    // Use event listener for close button (Alpine.js can't access closure variables)
    closeBtn.addEventListener('click', () => {
      // Update Alpine.js state if available
      if (window.Alpine && modal.__x) {
        modal.__x.$data.open = false;
        // Wait for transition, then remove
        setTimeout(() => {
          if (onClose) onClose();
          modal.remove();
        }, 200);
      } else {
        // Fallback: remove immediately
        if (onClose) onClose();
        modal.remove();
      }
    });
    header.appendChild(closeBtn);
  }
  
  // Body
  const body = document.createElement('div');
  body.className = 'p-6 text-gray-200';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }
  
  container.appendChild(header);
  container.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(container);
  
  return modal;
}

export function showModal(options: ModalOptions): void {
  const modal = Modal(options);
  document.body.appendChild(modal);
  
  // Initialize Alpine.js on the newly added modal element
  if (window.Alpine && window.Alpine.initTree) {
    window.Alpine.initTree(modal);
  }
}

export function closeModal(modal: HTMLElement): void {
  modal.remove();
}

