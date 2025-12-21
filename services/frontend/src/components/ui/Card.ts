// components/ui/Card.ts

interface CardOptions {
  children: HTMLElement | HTMLElement[] | string;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}: CardOptions): HTMLElement {
  const card = document.createElement('div');
  
  const variants = {
    default: 'bg-gray-800 border border-gray-700',
    elevated: 'bg-gray-800 shadow-xl',
    outlined: 'bg-transparent border-2 border-gray-600',
  };
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  card.className = `rounded-2xl ${variants[variant]} ${paddings[padding]} ${className}`;
  
  if (typeof children === 'string') {
    card.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => card.appendChild(child));
  } else {
    card.appendChild(children);
  }
  
  return card;
}

export function CardHeader({
  children,
  className = '',
}: { children: HTMLElement | string; className?: string }): HTMLElement {
  const header = document.createElement('div');
  header.className = `mb-4 ${className}`;
  
  if (typeof children === 'string') {
    header.innerHTML = children;
  } else {
    header.appendChild(children);
  }
  
  return header;
}

export function CardTitle({
  text,
  className = '',
}: { text: string; className?: string }): HTMLElement {
  const title = document.createElement('h3');
  title.className = `text-xl font-semibold text-white ${className}`;
  title.textContent = text;
  return title;
}

export function CardContent({
  children,
  className = '',
}: { children: HTMLElement | HTMLElement[] | string; className?: string }): HTMLElement {
  const content = document.createElement('div');
  content.className = `text-gray-300 ${className}`;
  
  if (typeof children === 'string') {
    content.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => content.appendChild(child));
  } else {
    content.appendChild(children);
  }
  
  return content;
}

export function CardFooter({
  children,
  className = '',
}: { children: HTMLElement | HTMLElement[]; className?: string }): HTMLElement {
  const footer = document.createElement('div');
  footer.className = `mt-4 flex gap-2 ${className}`;
  
  if (Array.isArray(children)) {
    children.forEach(child => footer.appendChild(child));
  } else {
    footer.appendChild(children);
  }
  
  return footer;
}

