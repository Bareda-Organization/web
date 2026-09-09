import React from 'react';

export function SegmentedControl({ options = [], value, onChange, block, style, ...rest }) {
  return (
    <div
      role="tablist" {...rest}
      style={{
        display: block ? 'flex' : 'inline-flex', width: block ? '100%' : undefined,
        gap: 4, padding: 4, background: 'var(--bg-subtle)',
        borderRadius: 'var(--radius-control)', ...style,
      }}
    >
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const on = opt.value === value;
        return (
          <button
            key={opt.value} role="tab" aria-selected={on} type="button"
            onClick={() => onChange && onChange(opt.value)}
            style={{
              flex: block ? 1 : undefined, height: 38, padding: '0 16px', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: on ? 'var(--surface-card)' : 'transparent',
              boxShadow: on ? 'var(--shadow-sm)' : 'none',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              font: (on ? 'var(--fw-medium)' : 'var(--fw-regular)') + ' var(--fs-label-sm)/1 var(--font-sans)',
              transition: 'var(--transition-control)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
