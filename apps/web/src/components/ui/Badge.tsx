import React from 'react';

export type BadgeVariant = 'teal' | 'sky' | 'amber' | 'emerald' | 'rose' | 'slate';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
  sky: 'bg-sky-50 text-sky-700 border-sky-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
