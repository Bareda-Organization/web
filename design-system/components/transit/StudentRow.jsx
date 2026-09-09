import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusPill } from '../core/StatusPill.jsx';

const rideMeta = {
  boarded: { label: '탑승 완료', status: 'boarded' },
  alighted: { label: '하차 완료', status: 'boarded' },
  absent: { label: '미등원', status: 'idle' },
  missed: { label: '미탑승', status: 'missed' },
  waiting: { label: '대기', status: 'idle' },
};

export function StudentRow({ name, meta, phone, ride = 'waiting', selected, onSelect, onCall, actions, style, ...rest }) {
  const m = rideMeta[ride] || rideMeta.waiting;
  return (
    <div
      {...rest}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 16px',
        background: selected ? 'var(--bg-subtle)' : 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: onSelect ? 'pointer' : undefined, transition: 'var(--transition-control)', ...style,
      }}
      onClick={onSelect}
    >
      <span style={{ width: 38, height: 38, flex: 'none', borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-brand)', display: 'grid', placeItems: 'center', font: 'var(--fw-bold) 14px/1 var(--font-sans)' }}>
        {name ? name.slice(-2) : ''}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--fw-medium) var(--fs-body-sm)/1.4 var(--font-sans)' }}>{name}</div>
        {meta ? <div style={{ font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: 'var(--text-secondary)' }}>{meta}</div> : null}
      </div>
      {phone && onCall ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onCall(); }} aria-label="보호자에게 연락"
          style={{ width: 38, height: 38, borderRadius: 999, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', color: 'var(--text-secondary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="phone" size={16} />
        </button>
      ) : null}
      {actions || <StatusPill status={m.status} showIcon={false}>{m.label}</StatusPill>}
    </div>
  );
}
