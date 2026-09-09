import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusPill } from '../core/StatusPill.jsx';

export function RunSummaryCard({ bus, leg, status = 'moving', statusLabel, eta, currentStop, nextStop, manager, driver, onClick, style, ...rest }) {
  return (
    <div
      onClick={onClick} {...rest}
      style={{
        background: 'var(--surface-card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)', padding: 20,
        cursor: onClick ? 'pointer' : undefined, ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusPill status={status}>{statusLabel}</StatusPill>
        <span style={{ marginLeft: 'auto', font: 'var(--fw-bold) var(--fs-label-sm)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{bus}{leg ? ' · ' + leg : ''}</span>
      </div>
      {eta ? (
        <div style={{ marginTop: 12, font: 'var(--fw-bold) 26px/1.3 var(--font-serif)', letterSpacing: '-0.015em' }}>{eta}</div>
      ) : null}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
            <Icon name="navigation" size={13} />현재 이동 중
          </div>
          <div style={{ marginTop: 6, font: 'var(--fw-medium) var(--fs-body-sm)/1.3 var(--font-sans)' }}>{currentStop}</div>
        </div>
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
            <Icon name="map-pin" size={13} />다음 정류장
          </div>
          <div style={{ marginTop: 6, font: 'var(--fw-medium) var(--fs-body-sm)/1.3 var(--font-sans)' }}>{nextStop}</div>
        </div>
      </div>
      {driver || manager ? (
        <div style={{ marginTop: 14, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: 'var(--text-secondary)' }}>
          {[driver ? '기사 ' + driver : null, manager ? '동승 매니저 ' + manager : null].filter(Boolean).join(' · ')}
        </div>
      ) : null}
    </div>
  );
}
