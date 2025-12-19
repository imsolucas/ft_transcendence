// components/shared/StatusIndicator.ts

export type UserStatus = 'online' | 'offline' | 'ingame';

interface StatusIndicatorOptions {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  className = '',
}: StatusIndicatorOptions): HTMLElement {
  const container = document.createElement('span');
  container.className = `inline-flex items-center gap-1.5 ${className}`;

  const dot = document.createElement('span');
  
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    ingame: 'bg-yellow-500',
  };

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    ingame: 'In Game',
  };

  dot.className = `${sizes[size]} ${statusColors[status]} rounded-full`;
  
  // Add pulsing animation for online and ingame
  if (status === 'online' || status === 'ingame') {
    dot.classList.add('animate-pulse');
  }

  container.appendChild(dot);

  if (showLabel) {
    const label = document.createElement('span');
    label.className = 'text-sm text-gray-300';
    label.textContent = statusLabels[status];
    container.appendChild(label);
  }

  return container;
}

export function updateUserStatus(userId: number, newStatus: UserStatus): void {
  // Update all status indicators for this user
  const statusElements = document.querySelectorAll(`[data-user-id="${userId}"]`);
  statusElements.forEach(el => {
    const statusDot = el.querySelector('.status-dot');
    if (statusDot) {
      // Remove old status classes
      statusDot.classList.remove('bg-green-500', 'bg-gray-500', 'bg-yellow-500', 'animate-pulse');
      
      // Add new status class
      const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-gray-500',
        ingame: 'bg-yellow-500',
      };
      statusDot.classList.add(statusColors[newStatus]);
      
      // Add pulse for active statuses
      if (newStatus === 'online' || newStatus === 'ingame') {
        statusDot.classList.add('animate-pulse');
      }
    }
  });
}

