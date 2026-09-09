import React from 'react';

export function Dialog({ open = true, title, children, footer, onClose, width = 420, style, ...rest }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'var(--overlay-scrim)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} {...rest}
        style={{
          width: '100%', maxWidth: width, background: 'var(--surface-card)',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-raised)',
          padding: 24, ...style,
        }}
      >
        {title ? <div style={{ font: 'var(--fw-bold) 22px/1.35 var(--font-serif)', letterSpacing: '-0.015em' }}>{title}</div> : null}
        <div style={{ marginTop: title ? 10 : 0, font: 'var(--fw-regular) var(--fs-body-sm)/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>{children}</div>
        {footer ? <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>{footer}</div> : null}
      </div>
    </div>
  );
}
