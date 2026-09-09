import React from 'react';

export function Switch({ checked, onChange, label, sublabel, disabled, style, ...rest }) {
  return (
    <label
      {...rest}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, minHeight: 48,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style,
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', font: 'var(--fw-regular) var(--fs-body)/1.5 var(--font-sans)' }}>{label}</span>
        {sublabel ? <span style={{ display: 'block', font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>{sublabel}</span> : null}
      </span>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{
        width: 46, height: 28, flex: 'none', borderRadius: 999, padding: 3,
        background: checked ? 'var(--accent-primary)' : 'var(--stone-300)',
        transition: 'background-color var(--dur-fast) var(--ease-standard)',
      }}>
        <span style={{
          display: 'block', width: 22, height: 22, borderRadius: 999, background: 'var(--white)',
          boxShadow: 'var(--shadow-sm)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform var(--dur-fast) var(--ease-standard)',
        }} />
      </span>
    </label>
  );
}
