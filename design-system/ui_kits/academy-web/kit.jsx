const { SideNav, IconButton, SegmentedControl, Badge, Icon } = window.DesignSystem_9e66e1;

const NAV = [
  { value: 'dash', label: '운행 관리', icon: 'layout-dashboard' },
  { value: 'today', label: '금일 운행', icon: 'bus' },
  { value: 'routes', label: '고정 노선', icon: 'route' },
  { value: 'students', label: '학생 정보 관리', icon: 'users-round' },
  { value: 'managers', label: '매니저 관리', icon: 'user-round' },
  { value: 'logs', label: '알림 로그', icon: 'bell', badge: 2 },
];

function AcademyWeb({ width }) {
  const [nav, setNav] = React.useState('dash');
  const [bus, setBus] = React.useState('3-2');
  const [adding, setAdding] = React.useState(false);
  const [saved, setSaved] = React.useState(null);

  let view;
  if (nav === 'dash') view = <WebDashboard onOpenRun={() => setNav('today')} />;
  else if (nav === 'today') view = <WebTodayRun bus={bus} setBus={setBus} />;
  else if (nav === 'routes') view = <WebRoutes />;
  else if (nav === 'students') view = adding
    ? <WebStudentAdd savedCode={saved} onCancel={() => { setAdding(false); setSaved(null); }} onSave={() => setSaved('PR-7H8QK2')} />
    : <WebStudents onAdd={() => { setAdding(true); setSaved(null); }} />;
  else if (nav === 'managers') view = <WebManagers />;
  else view = <WebLogs />;

  return (
    <div style={{ width, height: 860, display: 'flex', overflow: 'hidden', borderRadius: 14,
      boxShadow: 'var(--shadow-raised)', background: 'var(--bg-base)' }}>
      <SideNav academy="대치 한빛학원" items={NAV} value={nav}
        onChange={(v) => { setNav(v); setAdding(false); setSaved(null); }}
        style={{ width: width < 1200 ? 208 : 248 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 var(--gutter-desktop)',
          borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
          <span style={{ font: 'var(--fw-light) 13px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>2026년 8월 11일 화요일 · 등원 운행 중</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="red" count={2} />
            <IconButton icon="bell" label="알림" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--border-subtle)' }}>
              <span style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-brand)', display: 'grid', placeItems: 'center', font: 'var(--fw-bold) 12px var(--font-sans)' }}>원장</span>
              <span style={{ font: 'var(--fw-medium) 13px/1 var(--font-sans)' }}>정혜란</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{view}</div>
      </div>
    </div>
  );
}

function WebKitRoot() {
  const [w, setW] = React.useState(1440);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ font: 'var(--fw-bold) 11px/1 var(--font-sans)', letterSpacing: '.16em', color: 'var(--text-tertiary)' }}>ACADEMY STAFF WEB</div>
          <h2 style={{ marginTop: 8, fontSize: 26 }}>학원 관계자 웹</h2>
        </div>
        <div style={{ marginLeft: 'auto', width: 240 }}>
          <SegmentedControl block value={String(w)} onChange={(v) => setW(Number(v))}
            options={[{ value: '1440', label: '1440' }, { value: '1120', label: '1120' }]} />
        </div>
      </div>
      <AcademyWeb width={w} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WebKitRoot />);
