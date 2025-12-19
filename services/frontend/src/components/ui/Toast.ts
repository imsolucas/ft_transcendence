// components/ui/Toast.ts

type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

let toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function Toast({
  message,
  variant = 'default',
  duration = 3000,
  action,
}: ToastOptions): HTMLElement {
  const toast = document.createElement('div');
  
  const variants: Record<ToastVariant, string> = {
    default: 'bg-gray-800 border-gray-700',
    success: 'bg-green-800 border-green-700',
    warning: 'bg-yellow-800 border-yellow-700',
    error: 'bg-red-800 border-red-700',
    info: 'bg-blue-800 border-blue-700',
  };
  
  const icons: Record<ToastVariant, string> = {
    default: '●',
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ⓘ',
  };
  
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg border ${variants[variant]} text-white shadow-lg min-w-[300px] max-w-md animate-slide-in`;
  
  const content = document.createElement('div');
  content.className = 'flex items-center gap-3 flex-1';
  
  const icon = document.createElement('span');
  icon.className = 'text-lg font-bold';
  icon.textContent = icons[variant];
  
  const text = document.createElement('span');
  text.textContent = message;
  text.className = 'flex-1';
  
  content.appendChild(icon);
  content.appendChild(text);
  toast.appendChild(content);
  
  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm transition-colors';
    actionBtn.textContent = action.label;
    actionBtn.addEventListener('click', () => {
      action.onClick();
      removeToast(toast);
    });
    toast.appendChild(actionBtn);
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'text-white/70 hover:text-white text-xl leading-none';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => removeToast(toast));
  toast.appendChild(closeBtn);
  
  return toast;
}

function removeToast(toast: HTMLElement): void {
  toast.style.animation = 'slide-out 0.3s ease-out forwards';
  setTimeout(() => {
    toast.remove();
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
      toastContainer = null;
    }
  }, 300);
}

export function showToast(options: ToastOptions): void {
  const container = getToastContainer();
  const toast = Toast(options);
  container.appendChild(toast);
  
  if (options.duration && options.duration > 0) {
    setTimeout(() => removeToast(toast), options.duration);
  }
}

export function showSuccess(message: string, duration?: number): void {
  showToast({ message, variant: 'success', duration });
}

export function showError(message: string, duration?: number): void {
  showToast({ message, variant: 'error', duration });
}

export function showWarning(message: string, duration?: number): void {
  showToast({ message, variant: 'warning', duration });
}

export function showInfo(message: string, duration?: number): void {
  showToast({ message, variant: 'info', duration });
}

