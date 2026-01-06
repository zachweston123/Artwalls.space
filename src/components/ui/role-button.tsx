import React from 'react';

interface RoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  role: 'artist' | 'venue';
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export function RoleButton({ 
  role, 
  variant = 'primary', 
  children, 
  className = '',
  ...props 
}: RoleButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg transition-colors';
  
  let variantClasses = '';
  
  if (role === 'artist') {
    if (variant === 'primary') {
      variantClasses = 'bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)]';
    } else if (variant === 'secondary') {
      variantClasses = 'bg-[var(--surface-2)] text-[var(--blue)] hover:bg-[var(--surface-3)]';
    } else if (variant === 'ghost') {
      variantClasses = 'text-[var(--blue)] hover:bg-[var(--surface-2)]';
    }
  } else {
    if (variant === 'primary') {
      variantClasses = 'bg-[var(--green)] hover:opacity-90 text-[var(--accent-contrast)]';
    } else if (variant === 'secondary') {
      variantClasses = 'bg-[var(--green-muted)] text-[var(--green)] hover:opacity-90';
    } else if (variant === 'ghost') {
      variantClasses = 'text-[var(--green)] hover:bg-[var(--green-muted)]';
    }
  }
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
