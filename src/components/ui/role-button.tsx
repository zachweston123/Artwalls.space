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
      variantClasses = 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-400';
    } else if (variant === 'secondary') {
      variantClasses = 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800';
    } else if (variant === 'ghost') {
      variantClasses = 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900';
    }
  } else {
    if (variant === 'primary') {
      variantClasses = 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-400';
    } else if (variant === 'secondary') {
      variantClasses = 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800';
    } else if (variant === 'ghost') {
      variantClasses = 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900';
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
