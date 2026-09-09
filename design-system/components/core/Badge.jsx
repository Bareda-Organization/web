import React from 'react';

const badgeTone = {
  neutral: { background: 'var(--stone-100)', color: 'var(--stone-600)' },
  brand: { background: 'var(--accent-primary-soft)', color: 'var(--text-brand)' },
  amber: { background: 'var(--status-moving-soft)', color: 'var(--status-moving)' },
  red: { background: 'var(--status-missed-soft)', color: 'var(--status-missed)' },
  added: { background: 'var(--status-boarded-soft)', color: 'var(--status-boarded)' },
  removed: { background: 'var(--status-missed-soft)', color: 'var(--status-missed)' },
};

export function Badge({ tone = 'neutral', count, children, style, ...rest }) {
  const t = badgeTone[tone] || badgeTone.neutral;
  const isCount = count != null;
  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: isCount ? 20 : undefined, height: isCount ? 20 : undefined,
        padding: isCount ? '0 6px' : '3px 8px',
        borderRadius: 'var(--radius-pill)',
        font: 'var(--fw-bold) var(--fs-label-sm)/1 var(--font-sans)',
        ...t, ...style,
      }}
    >
      {isCount ? count : children}
    </span>
  );
}
