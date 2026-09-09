import React from 'react';
import { Icon } from '../core/Icon.jsx';

const alertTone = {
  info: { fg: 'var(--text-brand)', bg: 'var(--accent-primary-soft)', icon: 'info' },
  moving: { fg: 'var(--status-moving)', bg: 'var(--status-moving-soft)', icon: 'bus' },
  missed: { fg: 'var(--status-missed)', bg: 'var(--status-missed-soft)', icon: 'triangle-alert' },
  boarded: { fg: 'var(--status-boarded)', bg: 'var(--status-boarded-soft)', icon: 'circle-check' },
};

export function AlertBanner({ tone = 'info', title, children, action, style, ...rest }) {
  const t = alertTone[tone] || alertTone.info;
  return (
    <div {...rest} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: t.bg, borderRadius: 'var(--radius-md)', ...style }}>
      <span style={{ color: t.fg, marginTop: 2 }}><Icon name={t.icon} size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <div style={{ font: 'var(--fw-bold) var(--fs-body-sm)/1.4 var(--font-sans)', color: t.fg }}>{title}</div> : null}
        {children ? <div style={{ marginTop: title ? 4 : 0, font: 'var(--fw-regular) var(--fs-body-sm)/1.6 var(--font-sans)', color: 'var(--text-primary)' }}>{children}</div> : null}
        {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
      </div>
    </div>
  );
}
