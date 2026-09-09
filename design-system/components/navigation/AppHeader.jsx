import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function AppHeader({ title, subtitle, back, onBack, actions, tone = 'brand', style, ...rest }) {
  const inverse = tone === 'brand';
  return (
    <header
      {...rest}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 'var(--header-h)', padding: '0 12px 0 6px',
        background: inverse ? 'var(--surface-chrome)' : 'var(--bg-base)',
        color: inverse ? 'var(--text-on-chrome)' : 'var(--text-primary)',
        borderBottom: '1px solid ' + (inverse ? 'var(--border-chrome)' : 'var(--border-subtle)'),
        ...style,
      }}
    >
      {back ? (
        <button type="button" onClick={onBack} aria-label="뒤로"
          style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
          <Icon name="chevron-left" size={22} />
        </button>
      ) : <span style={{ width: 12 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--fw-bold) 17px/1.3 var(--font-sans)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle ? (
          <div style={{ font: 'var(--fw-light) var(--fs-micro)/1.4 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: inverse ? 'var(--text-on-chrome-muted)' : 'var(--text-secondary)' }}>{subtitle}</div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{actions}</div>
    </header>
  );
}
