import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => {
  return (
    <div
      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-2"
      style={{ color: '#7d8590', letterSpacing: '0.1em' }}
    >
      {children}
    </div>
  );
};