import React from 'react';

export function CodeInput({ length = 6, value = '', onChange, label, hint, error, style, ...rest }) {
  const chars = Array.from({ length }, (_, i) => value[i] || '');
  return (
    <div {...rest} style={style}>
      {label ? (
        <span style={{ display: 'block', marginBottom: 8, font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
      ) : null}
      <div style={{ position: 'relative' }}>
        <input
          value={value} inputMode="text" autoComplete="one-time-code" maxLength={length}
          onChange={(e) => onChange && onChange(e.target.value.toUpperCase().slice(0, length))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'text' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {chars.map((c, i) => (
            <span key={i} style={{
              flex: 1, height: 56, display: 'grid', placeItems: 'center',
              background: 'var(--surface-card)',
              border: '1px solid ' + (error ? 'var(--status-missed)' : c ? 'var(--accent-primary)' : 'var(--border-default)'),
              borderRadius: 'var(--radius-control)',
              font: 'var(--fw-bold) 24px/1 var(--font-sans)', letterSpacing: 0,
              color: 'var(--text-primary)', transition: 'var(--transition-control)',
            }}>{c || ''}</span>
          ))}
        </div>
      </div>
      {error || hint ? (
        <span style={{ display: 'block', marginTop: 8, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', color: error ? 'var(--status-missed)' : 'var(--text-secondary)' }}>{error || hint}</span>
      ) : null}
    </div>
  );
}
