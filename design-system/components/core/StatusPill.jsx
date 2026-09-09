import React from 'react';
import { Icon } from './Icon.jsx';

const statusMeta = {
  boarded: { fg: 'var(--status-boarded)', bg: 'var(--status-boarded-soft)', icon: 'circle-check', label: '승차 완료' },
  moving: { fg: 'var(--status-moving)', bg: 'var(--status-moving-soft)', icon: 'bus', label: '이동 중' },
  missed: { fg: 'var(--status-missed)', bg: 'var(--status-missed-soft)', icon: 'circle-alert', label: '미탑승' },
  idle: { fg: 'var(--status-idle)', bg: 'var(--status-idle-soft)', icon: 'clock', label: '운행 전' },
};

export function StatusPill({ status = 'boarded', children, dot, showIcon = true, style, ...rest }) {
  const m = statusMeta[status] || statusMeta.boarded;
  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 11px', borderRadius: 'var(--radius-pill)',
        background: m.bg, color: m.fg,
        font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)',
        ...style,
      }}
    >
      {dot ? <span style={{ width: 7, height: 7, borderRadius: 999, background: m.fg }} /> : null}
      {!dot && showIcon ? <Icon name={m.icon} size={14} /> : null}
      {children || m.label}
    </span>
  );
}
