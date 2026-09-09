import React from 'react';
import { Icon } from './Icon.jsx';

const btnVariant = {
  primary: { background: 'var(--accent-primary)', color: 'var(--text-inverse)', border: '1px solid transparent' },
  secondary: { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' },
  soft: { background: 'var(--accent-primary-soft)', color: 'var(--text-brand)', border: '1px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--text-brand)', border: '1px solid transparent' },
  danger: { background: 'var(--status-missed)', color: 'var(--white)', border: '1px solid transparent' },
};
const btnSize = {
  sm: { height: 36, padding: '0 14px', fontSize: 'var(--fs-label-sm)', gap: 6 },
  md: { height: 44, padding: '0 18px', fontSize: 'var(--fs-label)', gap: 8 },
  lg: { height: 52, padding: '0 22px', fontSize: 'var(--fs-body)', gap: 8 },
};

export function Button({
  variant = 'primary', size = 'md', icon, iconEnd, block, disabled,
  children, style, onClick, type = 'button', ...rest
}) {
  const [active, setActive] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const v = btnVariant[variant] || btnVariant.primary;
  const s = btnSize[size] || btnSize.md;
  return (
    <button
      type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}
      {...rest}
      style={{
        display: block ? 'flex' : 'inline-flex', width: block ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.height, padding: s.padding, fontSize: s.fontSize,
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--fw-medium)', letterSpacing: '-0.01em',
        borderRadius: 'var(--radius-control)', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition-control), transform var(--dur-fast) var(--ease-standard)',
        transform: active && !disabled ? 'scale(var(--press-scale))' : 'none',
        opacity: disabled ? 0.42 : 1,
        filter: hover && !disabled ? 'brightness(0.94)' : 'none',
        ...v, ...style,
      }}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  );
}
