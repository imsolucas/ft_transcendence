// components/ui/Dropdown.ts

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

interface DropdownOptions {
  trigger: string | HTMLElement;
  items: DropdownOption[];
  onSelect?: (value: string) => void;
  className?: string;
  align?: 'left' | 'right';
  direction?: 'down' | 'up';
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  className = '',
  align = 'left',
  direction = 'down',
}: DropdownOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = `relative inline-block ${className}`;
  
  // Add Alpine.js directive for reactive state (framework usage)
  container.setAttribute('x-data', '{ open: false }');
  
  // Trigger button
  const triggerBtn = document.createElement('button');
  triggerBtn.className = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors';
  
  // Add Alpine.js click handler (framework usage)
  triggerBtn.setAttribute('@click', 'open = !open');
  triggerBtn.setAttribute('@click.stop', '');
  
  // Arrow icon - rotate if opening upward
  const arrowIcon = direction === 'up' 
    ? '<svg class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
    : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
  
  if (typeof trigger === 'string') {
    triggerBtn.innerHTML = `${trigger} ${arrowIcon}`;
  } else {
    triggerBtn.appendChild(trigger);
    const arrow = document.createElement('span');
    arrow.innerHTML = arrowIcon;
    triggerBtn.appendChild(arrow);
  }
  
  // Dropdown menu - position based on direction
  const menu = document.createElement('div');
  const positionClass = direction === 'up' 
    ? `${align === 'left' ? 'left-0' : 'right-0'} bottom-full mb-2`
    : `${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2`;
  
  // Add Alpine.js directives for show/hide and outside click (framework usage)
  menu.className = `absolute ${positionClass} w-56 rounded-lg bg-gray-800 border border-gray-700 shadow-xl z-50`;
  menu.setAttribute('x-show', 'open');
  menu.setAttribute('x-transition:enter', 'transition ease-out duration-100');
  menu.setAttribute('x-transition:enter-start', 'opacity-0 scale-95');
  menu.setAttribute('x-transition:enter-end', 'opacity-100 scale-100');
  menu.setAttribute('x-transition:leave', 'transition ease-in duration-75');
  menu.setAttribute('x-transition:leave-start', 'opacity-100 scale-100');
  menu.setAttribute('x-transition:leave-end', 'opacity-0 scale-95');
  menu.setAttribute('@click.away', 'open = false');
  menu.setAttribute('@click.stop', '');
  
  items.forEach(item => {
    const menuItem = document.createElement('button');
    menuItem.className = 'w-full flex items-center gap-2 px-4 py-2 text-left text-gray-200 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors';
    
    // Add Alpine.js click handler (framework usage)
    menuItem.setAttribute('@click', `open = false`);
    
    if (item.icon) {
      const icon = document.createElement('span');
      icon.innerHTML = item.icon;
      menuItem.appendChild(icon);
    }
    
    const label = document.createElement('span');
    label.textContent = item.label;
    menuItem.appendChild(label);
    
    // Keep existing event listener for backward compatibility
    menuItem.addEventListener('click', () => {
      if (onSelect) onSelect(item.value);
    });
    
    menu.appendChild(menuItem);
  });
  
  // Keep existing event listeners as fallback (backward compatibility)
  let isOpen = false;
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    // Alpine will handle the toggle, but we keep this for compatibility
  });
  
  // Prevent clicks inside menu from closing
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  container.appendChild(triggerBtn);
  container.appendChild(menu);
  
  return container;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
}: {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}): HTMLElement {
  const selectedOption = options.find(opt => opt.value === value);
  
  return Dropdown({
    trigger: selectedOption?.label || placeholder,
    items: options,
    onSelect: onChange,
    className,
  });
}

