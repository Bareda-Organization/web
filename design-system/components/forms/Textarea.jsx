import React from 'react';

export function Textarea({ label, hint, rows = 4, style, wrapStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', ...wrapStyle }}>
      {label ? (
        <span style={{ display: 'block', marginBottom: 6, font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
      ) : null}
      <textarea
        rows={rows} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}
        style={{
          width: '100%', padding: '12px 14px', resize: 'vertical',
          background: 'var(--surface-card)', color: 'var(--text-primary)',
          border: '1px solid ' + (focus ? 'var(--focus-ring)' : 'var(--border-default)'),
          borderRadius: 'var(--radius-control)', outline: 'none',
          boxShadow: focus ? 'var(--focus-shadow)' : 'none',
          font: 'var(--fw-regular) var(--fs-body)/var(--lh-body) var(--font-sans)',
          transition: 'var(--transition-control)', ...style,
        }}
      />
      {hint ? (
        <span style={{ display: 'block', marginTop: 6, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>{hint}</span>
      ) : null}
    </label>
  );
}
