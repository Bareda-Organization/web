import React from 'react';
import { StatusPill } from '../core/StatusPill.jsx';
import { Icon } from '../core/Icon.jsx';

export function NotificationCard({ status = 'boarded', statusLabel, title, meta, sub, time, unread, onClick, style, ...rest }) {
  return (
    <div
      onClick={onClick} {...rest}
      style={{
        display: 'flex', gap: 14, padding: '16px 18px',
        background: 'var(--surface-card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)', cursor: onClick ? 'pointer' : undefined,
        transition: 'var(--transition-control)', ...style,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusPill status={status}>{statusLabel}</StatusPill>
          {unread ? <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent-secondary)' }} /> : null}
          {time ? <span style={{ marginLeft: 'auto', font: 'var(--fw-light) var(--fs-micro)/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>{time}</span> : null}
        </div>
        <div style={{ marginTop: 10, font: 'var(--fw-bold) 20px/1.35 var(--font-serif)', letterSpacing: '-0.015em' }}>{title}</div>
        {meta ? <div style={{ marginTop: 6, font: 'var(--fw-regular) var(--fs-body-sm)/1.6 var(--font-sans)' }}>{meta}</div> : null}
        {sub ? <div style={{ marginTop: 2, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: 'var(--text-secondary)' }}>{sub}</div> : null}
      </div>
      {onClick ? <span style={{ color: 'var(--text-tertiary)', alignSelf: 'center' }}><Icon name="chevron-right" size={20} /></span> : null}
    </div>
  );
}
