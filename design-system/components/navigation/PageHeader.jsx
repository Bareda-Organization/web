import React from 'react';

export function PageHeader({ title, description, actions, tabs, style, ...rest }) {
  return (
    <div {...rest} style={{ padding: '26px var(--gutter-desktop) 0', ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ font: 'var(--fw-bold) 30px/1.25 var(--font-serif)', letterSpacing: '-0.02em' }}>{title}</h2>
          {description ? (
            <div style={{ marginTop: 6, font: 'var(--fw-light) var(--fs-caption)/1.6 var(--font-sans)', letterSpacing: 'var(--ls-caption)', color: 'var(--text-secondary)' }}>{description}</div>
          ) : null}
        </div>
        {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
      </div>
      {tabs ? <div style={{ marginTop: 20, borderBottom: '1px solid var(--border-subtle)' }}>{tabs}</div> : null}
    </div>
  );
}
