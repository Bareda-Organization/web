import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Checkbox({ checked, onChange, label, sublabel, disabled, style, ...rest }) {
  return (
    <label
      {...rest}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, minHeight: 44,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style,
      }}
    >
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{
        width: 22, height: 22, flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center',
        borderRadius: 'var(--radius-xs)',
        background: checked ? 'var(--accent-primary)' : 'var(--surface-card)',
        border: '1px solid ' + (checked ? 'var(--accent-primary)' : 'var(--border-default)'),
        color: 'var(--text-inverse)', transition: 'var(--transition-control)',
      }}>
        {checked ? <Icon name="check" size={14} /> : null}
      </span>
      <span>
        <span style={{ display: 'block', font: 'var(--fw-regular) var(--fs-body-sm)/1.5 var(--font-sans)' }}>{label}</span>
        {sublabel ? <span style={{ display: 'block', font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>{sublabel}</span> : null}
      </span>
    </label>
  );
}
