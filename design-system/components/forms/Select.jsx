import React from 'react';
import { Icon } from '../core/Icon.jsx';

const fieldBase = {
  width: '100%', height: 48, padding: '0 14px',
  background: 'var(--surface-card)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-control)',
  font: 'var(--fw-regular) var(--fs-body)/1 var(--font-sans)',
  outline: 'none', transition: 'var(--transition-control)',
};

export function Select({ label, hint, options = [], value, onChange, style, wrapStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', ...wrapStyle }}>
      {label ? (
        <span style={{ display: 'block', marginBottom: 6, font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
      ) : null}
      <span style={{ position: 'relative', display: 'block' }}>
        <select
          value={value} onChange={onChange}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}
          style={{
            ...fieldBase, appearance: 'none', paddingRight: 40, cursor: 'pointer',
            borderColor: focus ? 'var(--focus-ring)' : 'var(--border-default)',
            boxShadow: focus ? 'var(--focus-shadow)' : 'none', ...style,
          }}
        >
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
          <Icon name="chevron-down" size={18} />
        </span>
      </span>
      {hint ? (
        <span style={{ display: 'block', marginTop: 6, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>{hint}</span>
      ) : null}
    </label>
  );
}
