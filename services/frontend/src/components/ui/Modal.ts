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
  
  // Add Stimulus controller for modal functionality
  modal.setAttribute('data-controller', 'modal');
  modal.setAttribute('data-modal-open-value', 'true');
  // Store onClose callback in data attribute for controller access
  if (onClose) {
    modal.setAttribute('data-modal-onclose', 'true');
    (modal as any)._onClose = onClose;
  }
  
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-black/50 backdrop-blur-sm';
  backdrop.setAttribute('data-modal-target', 'backdrop');
  backdrop.setAttribute('data-action', 'click->modal#closeOnBackdrop');
  
  // Modal content container
  const container = document.createElement('div');
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };
  container.className = `relative ${sizeClasses[size]} w-full mx-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700`;
  container.setAttribute('data-modal-target', 'container');
  container.setAttribute('data-action', 'click->modal#stopPropagation');
  
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
    closeBtn.setAttribute('data-action', 'click->modal#close');
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
  
  // Stimulus automatically initializes controllers on new elements
  // No manual initialization needed
}

export function closeModal(modal: HTMLElement): void {
  // Use Stimulus controller if available, otherwise remove directly
  const controller = (modal as any).stimulus?.getControllerForElementAndIdentifier?.(modal, 'modal');
  if (controller) {
    controller.close();
  } else {
    modal.remove();
  }
}

