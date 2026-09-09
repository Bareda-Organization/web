import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function TabBar({ items = [], value, onChange, style, ...rest }) {
  return (
    <nav
      {...rest}
      style={{
        display: 'flex', height: 'var(--tabbar-h)',
        background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', ...style,
      }}
    >
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value} type="button" onClick={() => onChange && onChange(it.value)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: on ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              transition: 'var(--transition-control)', position: 'relative',
            }}
          >
            <span style={{ position: 'relative' }}>
              <Icon name={it.icon} size={24} />
              {it.badge ? (
                <span style={{ position: 'absolute', top: -3, right: -8, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--status-missed)', color: 'var(--white)', font: 'var(--fw-bold) 10px/16px var(--font-sans)', textAlign: 'center' }}>{it.badge}</span>
              ) : null}
            </span>
            <span style={{ font: (on ? 'var(--fw-medium)' : 'var(--fw-regular)') + ' 11px/1 var(--font-sans)' }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
