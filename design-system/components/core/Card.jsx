import React from 'react';

const cardTone = {
  base: { background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)', border: 'none' },
  mist: { background: 'var(--bg-subtle)', boxShadow: 'none', border: 'none' },
  outline: { background: 'var(--surface-card)', boxShadow: 'none', border: '1px solid var(--border-subtle)' },
  inverse: { background: 'var(--surface-inverse)', boxShadow: 'var(--shadow-card)', border: 'none', color: 'var(--text-inverse)' },
};

export function Card({ tone = 'base', padding = 20, accent, onClick, children, style, ...rest }) {
  const t = cardTone[tone] || cardTone.base;
  return (
    <div
      onClick={onClick} {...rest}
      style={{
        borderRadius: 'var(--radius-card)', padding,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'var(--transition-control)',
        ...t,
        ...(accent ? { borderTop: '3px solid var(--status-' + accent + ')' } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
