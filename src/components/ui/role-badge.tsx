import React from 'react';

interface RoleBadgeProps {
  role: 'artist' | 'venue';
  children: React.ReactNode;
  className?: string;
}

export function RoleBadge({ role, children, className = '' }: RoleBadgeProps) {
  const artistClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  const venueClasses = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-sm ${role === 'artist' ? artistClasses : venueClasses} ${className}`}>
      {children}
    </span>
  );
}
