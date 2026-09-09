import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EmptyState({ icon = 'bus', title, children, action, style, ...rest }) {
  return (
    <div {...rest} style={{ padding: '48px 24px', textAlign: 'center', ...style }}>
      <span style={{ display: 'inline-grid', placeItems: 'center', width: 56, height: 56, borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-brand)' }}>
        <Icon name={icon} size={26} />
      </span>
      <div style={{ marginTop: 16, font: 'var(--fw-bold) 20px/1.4 var(--font-serif)', letterSpacing: '-0.015em' }}>{title}</div>
      {children ? <div style={{ marginTop: 8, font: 'var(--fw-light) var(--fs-caption)/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>{children}</div> : null}
      {action ? <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>{action}</div> : null}
    </div>
  );
}
