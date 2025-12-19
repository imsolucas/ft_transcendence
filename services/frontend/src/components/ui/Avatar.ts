// components/ui/Avatar.ts

interface AvatarOptions {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'ingame';
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '',
  status,
}: AvatarOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = `relative inline-block ${className}`;
  
  const avatar = document.createElement('div');
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  
  avatar.className = `${sizes[size]} rounded-full overflow-hidden bg-gray-700 flex items-center justify-center`;
  
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'w-full h-full object-cover';
    img.onerror = () => {
      // Fallback to initials if image fails to load
      avatar.innerHTML = '';
      const initials = document.createElement('span');
      initials.className = 'text-white font-semibold';
      initials.textContent = fallback || alt.charAt(0).toUpperCase();
      avatar.appendChild(initials);
    };
    avatar.appendChild(img);
  } else {
    // Show fallback initials
    const initials = document.createElement('span');
    initials.className = 'text-white font-semibold';
    initials.textContent = fallback || alt.charAt(0).toUpperCase();
    avatar.appendChild(initials);
  }
  
  container.appendChild(avatar);
  
  // Add status indicator if provided
  if (status) {
    const statusIndicator = document.createElement('span');
    const statusSizes = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
      xl: 'w-5 h-5',
    };
    
    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-500',
      ingame: 'bg-yellow-500',
    };
    
    statusIndicator.className = `absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full border-2 border-gray-800`;
    container.appendChild(statusIndicator);
  }
  
  return container;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = 'md',
}: {
  avatars: AvatarOptions[];
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}): HTMLElement {
  const group = document.createElement('div');
  group.className = 'flex -space-x-2';
  
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;
  
  displayAvatars.forEach(avatarOpt => {
    const avatar = Avatar({ ...avatarOpt, size });
    avatar.className = `${avatar.className} ring-2 ring-gray-800`;
    group.appendChild(avatar);
  });
  
  if (remaining > 0) {
    const more = document.createElement('div');
    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-12 h-12 text-sm',
      lg: 'w-16 h-16 text-base',
      xl: 'w-24 h-24 text-lg',
    };
    more.className = `${sizes[size]} rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-gray-800`;
    more.innerHTML = `<span class="text-white font-semibold">+${remaining}</span>`;
    group.appendChild(more);
  }
  
  return group;
}

