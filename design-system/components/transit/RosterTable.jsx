import React from 'react';

export function RosterTable({ columns = [], rows = [], onRowClick, style, ...rest }) {
  return (
    <div {...rest} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--fw-regular) var(--fs-body-sm)/1.5 var(--font-sans)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-subtle)' }}>
            {columns.map((c) => (
              <th key={c.key} style={{
                textAlign: c.align || 'left', padding: '12px 16px',
                font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-sans)', letterSpacing: 'var(--ls-micro)',
                color: 'var(--text-secondary)', whiteSpace: 'nowrap', width: c.width,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={() => onRowClick && onRowClick(r)}
              style={{ borderTop: '1px solid var(--border-subtle)', cursor: onRowClick ? 'pointer' : undefined }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left', padding: '13px 16px', verticalAlign: 'middle' }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
