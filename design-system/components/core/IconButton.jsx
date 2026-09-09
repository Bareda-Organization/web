import React from 'react';
import { Icon } from './Icon.jsx';

const iconBtnTone = {
  plain: { background: 'transparent', color: 'var(--text-secondary)' },
  soft: { background: 'var(--accent-primary-soft)', color: 'var(--text-brand)' },
  inverse: { background: 'transparent', color: 'var(--text-on-chrome)' },
};

export function IconButton({ icon, label, tone = 'plain', size = 40, style, ...rest }) {
  const t = iconBtnTone[tone] || iconBtnTone.plain;
  return (
    <button
      type="button" aria-label={label} title={label} {...rest}
      style={{
        width: size, height: size, display: 'grid', placeItems: 'center',
        border: 'none', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        transition: 'var(--transition-control)', ...t, ...style,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}
