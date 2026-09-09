import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SearchField({ value, onChange, onSubmit, placeholder = '이름으로 검색', style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(value); }} {...rest}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 6px 0 14px',
        background: 'var(--surface-card)',
        border: '1px solid ' + (focus ? 'var(--focus-ring)' : 'var(--border-default)'),
        borderRadius: 'var(--radius-pill)', boxShadow: focus ? 'var(--focus-shadow)' : 'none',
        transition: 'var(--transition-control)', ...style,
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}><Icon name="search" size={18} /></span>
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', font: 'var(--fw-regular) var(--fs-body-sm)/1 var(--font-sans)' }}
      />
      <button type="submit" style={{
        height: 32, padding: '0 14px', border: 'none', borderRadius: 'var(--radius-pill)',
        background: 'var(--accent-primary)', color: 'var(--text-inverse)', cursor: 'pointer',
        font: 'var(--fw-medium) var(--fs-label-sm)/1 var(--font-sans)',
      }}>검색</button>
    </form>
  );
}
