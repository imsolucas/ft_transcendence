// components/ui/Spinner.ts

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'default' | 'primary' | 'white';

interface SpinnerOptions {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
  label?: string;
}

export function Spinner({
  size = 'md',
  variant = 'default',
  className = '',
  label,
}: SpinnerOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = `inline-flex flex-col items-center gap-2 ${className}`;
  
  const spinner = document.createElement('div');
  
  const sizes: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };
  
  const variants: Record<SpinnerVariant, string> = {
    default: 'border-gray-600 border-t-gray-300',
    primary: 'border-blue-600 border-t-blue-300',
    white: 'border-white/20 border-t-white',
  };
  
  spinner.className = `rounded-full ${sizes[size]} ${variants[variant]} animate-spin`;
  container.appendChild(spinner);
  
  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'text-sm text-gray-400';
    labelEl.textContent = label;
    container.appendChild(labelEl);
  }
  
  return container;
}

export function LoadingOverlay({
  message = 'Loading...',
  show = true,
}: {
  message?: string;
  show?: boolean;
}): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = `fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${show ? '' : 'hidden'}`;
  
  const content = document.createElement('div');
  content.className = 'flex flex-col items-center gap-4 p-8 bg-gray-800 rounded-2xl border border-gray-700';
  
  const spinner = Spinner({ size: 'lg', variant: 'primary' });
  const text = document.createElement('p');
  text.className = 'text-white text-lg';
  text.textContent = message;
  
  content.appendChild(spinner);
  content.appendChild(text);
  overlay.appendChild(content);
  
  return overlay;
}

export function showLoadingOverlay(message?: string): HTMLElement {
  const overlay = LoadingOverlay({ message, show: true });
  document.body.appendChild(overlay);
  return overlay;
}

export function hideLoadingOverlay(overlay: HTMLElement): void {
  overlay.remove();
}

