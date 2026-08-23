import * as icons from 'lucide-react';

export default function Icon({ i, size = 24, className = '' }: { i: string, size?: number, className?: string }) {
  // Convert kebab-case to PascalCase
  const name = i.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  
  // @ts-ignore
  const LucideIcon = icons[name];
  
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} />;
}
