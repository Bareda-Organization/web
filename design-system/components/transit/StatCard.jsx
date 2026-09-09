import React from 'react';
import { Icon } from '../core/Icon.jsx';

const statTone = {
  neutral: 'var(--text-primary)',
  boarded: 'var(--status-boarded)',
  moving: 'var(--status-moving)',
  missed: 'var(--status-missed)',
};

export function StatCard({ label, value, unit, tone = 'neutral', icon, sub, style, ...rest }) {
  return (
    <div {...rest} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: 18, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
        {icon ? <Icon name={icon} size={14} /> : null}{label}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ font: 'var(--fw-bold) 30px/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums', color: statTone[tone] || statTone.neutral }}>{value}</span>
        {unit ? <span style={{ font: 'var(--fw-medium) var(--fs-body-sm)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{unit}</span> : null}
      </div>
      {sub ? <div style={{ marginTop: 6, font: 'var(--fw-light) var(--fs-micro)/1.4 var(--font-sans)', color: 'var(--text-tertiary)' }}>{sub}</div> : null}
    </div>
  );
}
