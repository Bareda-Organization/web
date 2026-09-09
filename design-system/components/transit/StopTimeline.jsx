import React from 'react';
import { Icon } from '../core/Icon.jsx';

const stopState = {
  done: { dot: 'var(--status-boarded)', label: 'var(--text-secondary)' },
  current: { dot: 'var(--status-moving)', label: 'var(--text-primary)' },
  next: { dot: 'var(--stone-300)', label: 'var(--text-primary)' },
  upcoming: { dot: 'var(--stone-300)', label: 'var(--text-secondary)' },
};

export function StopTimeline({ stops = [], onSelect, dense, style, ...rest }) {
  return (
    <ol {...rest} style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>
      {stops.map((s, i) => {
        const st = stopState[s.state] || stopState.upcoming;
        const last = i === stops.length - 1;
        const isCurrent = s.state === 'current';
        return (
          <li key={s.name + i} style={{ display: 'flex', gap: 14, cursor: onSelect ? 'pointer' : undefined }} onClick={() => onSelect && onSelect(s, i)}>
            <div style={{ width: 24, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{
                width: isCurrent ? 24 : 12, height: isCurrent ? 24 : 12, marginTop: 4,
                borderRadius: 999, background: isCurrent ? 'var(--status-moving)' : st.dot,
                display: 'grid', placeItems: 'center', color: 'var(--white)', flex: 'none',
                boxShadow: isCurrent ? '0 0 0 4px var(--status-moving-soft)' : 'none',
              }}>
                {isCurrent ? <Icon name="bus" size={13} /> : null}
              </span>
              {!last ? <span style={{ flex: 1, width: 2, background: s.state === 'done' ? 'var(--status-boarded)' : 'var(--stone-200)', minHeight: dense ? 18 : 26 }} /> : null}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : (dense ? 12 : 18) }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ font: (isCurrent ? 'var(--fw-bold)' : 'var(--fw-medium)') + ' var(--fs-body-sm)/1.4 var(--font-sans)', color: st.label }}>{s.name}</span>
                {s.time ? <span style={{ marginLeft: 'auto', font: 'var(--fw-bold) var(--fs-micro)/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums', color: isCurrent ? 'var(--status-moving)' : 'var(--text-tertiary)' }}>{s.time}</span> : null}
              </div>
              {s.address ? <div style={{ marginTop: 2, font: 'var(--fw-light) var(--fs-micro)/1.5 var(--font-sans)', letterSpacing: 'var(--ls-micro)', color: 'var(--text-tertiary)' }}>{s.address}</div> : null}
              {s.riders != null ? (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
                  <Icon name="users-round" size={13} />{s.riders}명
                  {s.missed ? <span style={{ color: 'var(--status-missed)', fontWeight: 'var(--fw-bold)' }}>· 미탑승 {s.missed}</span> : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
