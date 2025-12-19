// components/ui/Badge.ts

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeOptions {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: string;
}

export function Badge({
  text,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
}: BadgeOptions): HTMLElement {
  const badge = document.createElement('span');
  
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-700 text-gray-200',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    outline: 'border border-gray-600 text-gray-300 bg-transparent',
  };
  
  const sizes: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  badge.className = `inline-flex items-center gap-1 rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`;
  
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.innerHTML = icon;
    iconEl.className = 'inline-block';
    badge.appendChild(iconEl);
  }
  
  const textEl = document.createElement('span');
  textEl.textContent = text;
  badge.appendChild(textEl);
  
  return badge;
}

export function StatusBadge({
  status,
  className = '',
}: {
  status: 'online' | 'offline' | 'ingame';
  className?: string;
}): HTMLElement {
  const statusMap = {
    online: { text: 'Online', variant: 'success' as BadgeVariant, icon: '●' },
    offline: { text: 'Offline', variant: 'default' as BadgeVariant, icon: '●' },
    ingame: { text: 'In Game', variant: 'warning' as BadgeVariant, icon: '●' },
  };
  
  const { text, variant, icon } = statusMap[status];
  
  return Badge({ text, variant, icon, size: 'sm', className });
}

