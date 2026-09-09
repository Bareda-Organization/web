import React from 'react';

const DELAY_OPTIONS = [5, 10, 15, 20, 25, 30];

export function DelayPicker({ value, onChange, options = DELAY_OPTIONS, style, ...rest }) {
  return (
    <div {...rest} style={style}>
      <div style={{ font: 'var(--fw-medium) var(--fs-label-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)', marginBottom: 10 }}>지연 시간 · 5분 단위</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {options.map((m) => {
          const on = m === value;
          return (
            <button
              key={m} type="button" onClick={() => onChange && onChange(m)}
              style={{
                height: 52, borderRadius: 'var(--radius-control)', cursor: 'pointer',
                background: on ? 'var(--status-moving-soft)' : 'var(--surface-card)',
                border: '1px solid ' + (on ? 'var(--status-moving)' : 'var(--border-default)'),
                color: on ? 'var(--status-moving)' : 'var(--text-primary)',
                font: 'var(--fw-bold) var(--fs-body)/1 var(--font-sans)',
                transition: 'var(--transition-control)',
              }}
            >
              {m}분
            </button>
          );
        })}
      </div>
    </div>
  );
}
