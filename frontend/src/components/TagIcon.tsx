'use client';

interface TagIconProps {
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Size mappings for the icon
const sizeClasses = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
};

export default function TagIcon({ icon, size = 'sm', className = '' }: TagIconProps) {
  if (!icon) return null;

  return (
    <span className={`material-symbols-rounded ${sizeClasses[size]} ${className}`}>
      {icon}
    </span>
  );
}
