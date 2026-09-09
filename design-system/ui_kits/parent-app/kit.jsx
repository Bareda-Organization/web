const { AppHeader, TabBar, IconButton, Icon } = window.DesignSystem_9e66e1;

function ParentApp() {
  const [signed, setSigned] = React.useState(false);
  const [role, setRole] = React.useState('학부모');
  const [code, setCode] = React.useState('');
  const [tab, setTab] = React.useState('home');
  const [page, setPage] = React.useState(null);
  const [attend, setAttend] = React.useState('등원');
  const [sheet, setSheet] = React.useState(false);

  const tabs = [
    { value: 'home', label: '홈', icon: 'house' },
    { value: 'map', label: '실시간', icon: 'map-pin' },
    { value: 'route', label: '노선', icon: 'route' },
    { value: 'settings', label: '설정', icon: 'settings' },
  ];

  let header, body, scroll = true;
  if (page === 'schedule') {
    header = <AppHeader tone="plain" back onBack={() => setPage(null)} title="탑승 위치 변경" />;
    body = <ScheduleScreen onDone={() => setPage(null)} />;
  } else if (tab === 'home') {
    header = <AppHeader title="바래다" subtitle={'3-2호차 · 등원 · ' + role}
      actions={<><IconButton icon="calendar" label="탑승 위치 변경" tone="inverse" onClick={() => setPage('schedule')} /><IconButton icon="bell" label="알림" tone="inverse" /></>} />;
    body = <HomeScreen role={role} attend={attend} setAttend={setAttend}
      onOpenMap={() => setTab('map')} onOpenRoute={() => setTab('route')} />;
  } else if (tab === 'map') {
    header = <AppHeader title="실시간 운행 정보" subtitle="3-2호차 · 등원" />;
    body = <LiveMapScreen sheetOpen={sheet} setSheetOpen={setSheet} />;
    scroll = false;
  } else if (tab === 'route') {
    header = <AppHeader title="상세 노선" subtitle="3-2호차 고정 노선" />;
    body = <RouteDetailScreen />;
  } else {
    header = <AppHeader tone="plain" title="설정" />;
    body = <SettingsScreen role={role} />;
  }

  return (
    <div style={{ width: 390, height: 844, borderRadius: 28, overflow: 'hidden', background: 'var(--bg-base)',
      boxShadow: 'var(--shadow-raised)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {!signed ? (
        <LoginScreen role={role} setRole={setRole} code={code} setCode={setCode} onSubmit={() => setSigned(true)} />
      ) : (
        <React.Fragment>
          {header}
          <div style={{ flex: 1, minHeight: 0, overflowY: scroll ? 'auto' : 'hidden', position: 'relative' }}>{body}</div>
          <TabBar items={tabs} value={tab} onChange={(v) => { setTab(v); setPage(null); }} />
        </React.Fragment>
      )}
    </div>
  );
}

function KitRoot() {
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
      <ParentApp />
      <div style={{ maxWidth: 300, paddingTop: 8 }}>
        <div style={{ font: 'var(--fw-bold) 11px/1 var(--font-sans)', letterSpacing: '.16em', color: 'var(--text-tertiary)' }}>PARENT · STUDENT APP</div>
        <h2 style={{ marginTop: 12, fontSize: 26 }}>학부모·학생 앱</h2>
        <div style={{ marginTop: 10, font: 'var(--fw-light) 14px/1.8 var(--font-sans)', color: 'var(--text-secondary)' }}>
          코드로 로그인하고, 홈 → 실시간 → 노선 → 설정을 눌러 이동해 보세요.
          학생으로 로그인하면 등원 여부 변경과 탑승 위치 변경이 사라집니다.
        </div>
        <ul style={{ marginTop: 16, paddingLeft: 18, font: 'var(--fw-light) 13px/1.9 var(--font-sans)', color: 'var(--text-secondary)' }}>
          <li>로그인 — 학부모/학생 코드 6자리</li>
          <li>홈 — 오늘 운행 요약 · 알림 타임라인 · 등원 여부</li>
          <li>실시간 — 지도 + 정류장 타임라인 바텀시트</li>
          <li>노선 — 3-2호차 고정 노선 상세</li>
          <li>설정 — 알림 on/off (지연 알림은 고정)</li>
          <li>헤더 달력 아이콘 — 탑승 위치 변경</li>
        </ul>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<KitRoot />);
