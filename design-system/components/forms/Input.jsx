import React from 'react';
import { Icon } from '../core/Icon.jsx';

const fieldBase = {
  width: '100%', height: 48, padding: '0 14px',
  background: 'var(--surface-card)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-control)',
  font: 'var(--fw-regular) var(--fs-body)/1 var(--font-sans)',
  outline: 'none', transition: 'var(--transition-control)',
};

export function Input({ label, hint, error, icon, suffix, required, style, wrapStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', ...wrapStyle }}>
      {label ? (
        <span style={{ display: 'block', marginBottom: 6, font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>
          {label}{required ? <span style={{ color: 'var(--status-missed)' }}> *</span> : null}
        </span>
      ) : null}
      <span style={{ position: 'relative', display: 'block' }}>
        {icon ? (
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <input
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}
          style={{
            ...fieldBase,
            paddingLeft: icon ? 42 : 14, paddingRight: suffix ? 56 : 14,
            borderColor: error ? 'var(--status-missed)' : focus ? 'var(--focus-ring)' : 'var(--border-default)',
            boxShadow: focus ? 'var(--focus-shadow)' : 'none',
            ...style,
          }}
        />
        {suffix ? (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', font: 'var(--fw-light) var(--fs-caption)/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>{suffix}</span>
        ) : null}
      </span>
      {error || hint ? (
        <span style={{ display: 'block', marginTop: 6, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: error ? 'var(--status-missed)' : 'var(--text-secondary)' }}>{error || hint}</span>
      ) : null}
    </label>
  );
}
