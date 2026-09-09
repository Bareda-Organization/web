import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SideNav({ items = [], value, onChange, academy, style, ...rest }) {
  return (
    <aside
      {...rest}
      style={{
        width: 'var(--sidenav-w)', flex: 'none', display: 'flex', flexDirection: 'column',
        background: 'var(--surface-chrome)', color: 'var(--text-on-chrome)',
        borderRight: '1px solid var(--border-chrome)', padding: '20px 12px', ...style,
      }}
    >
      <div style={{ padding: '0 10px 20px' }}>
        <div style={{ font: 'var(--fw-black) 24px/1 var(--font-serif)', letterSpacing: '-0.03em' }}>바래다</div>
        {academy ? <div style={{ marginTop: 6, font: 'var(--fw-light) var(--fs-micro)/1.4 var(--font-sans)', color: 'var(--text-on-chrome-muted)' }}>{academy}</div> : null}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button
              key={it.value} type="button" onClick={() => onChange && onChange(it.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 10px',
                background: on ? 'var(--nav-active-bg)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: on ? 'var(--nav-active-text)' : 'var(--nav-text)',
                font: (on ? 'var(--fw-medium)' : 'var(--fw-regular)') + ' var(--fs-body-sm)/1 var(--font-sans)',
                textAlign: 'left', transition: 'var(--transition-control)',
              }}
            >
              <Icon name={it.icon} size={18} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge ? (
                <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: 'var(--status-missed)', color: 'var(--white)', font: 'var(--fw-bold) 11px/20px var(--font-sans)', textAlign: 'center' }}>{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
