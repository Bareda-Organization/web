import React from 'react';

export function BottomSheet({ open = true, title, children, onClose, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--overlay-scrim)' }} />
      <div
        {...rest}
        style={{
          position: 'relative', background: 'var(--surface-card)',
          borderRadius: 'var(--radius-sheet) var(--radius-sheet) 0 0',
          boxShadow: 'var(--shadow-sheet)', padding: '12px 20px 24px',
          animation: 'none', ...style,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--stone-200)', margin: '0 auto 14px' }} />
        {title ? <div style={{ font: 'var(--fw-bold) 20px/1.35 var(--font-serif)', letterSpacing: '-0.015em', marginBottom: 12 }}>{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
