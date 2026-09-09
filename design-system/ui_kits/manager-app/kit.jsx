const { AppHeader, TabBar, IconButton, SegmentedControl } = window.DesignSystem_9e66e1;

function ManagerApp({ theme }) {
  const [signed, setSigned] = React.useState(false);
  const [role, setRole] = React.useState('버스기사');
  const [code, setCode] = React.useState('');
  const [tab, setTab] = React.useState('drive');
  const [page, setPage] = React.useState(null);
  const [sent, setSent] = React.useState(false);

  const tabs = [
    { value: 'home', label: '담당 노선', icon: 'route' },
    { value: 'drive', label: '운행모드', icon: 'navigation' },
    { value: 'map', label: '지도', icon: 'map-pin' },
    { value: 'end', label: '리포트', icon: 'list' },
  ];

  let header, body;
  if (page === 'stop') {
    header = <AppHeader back onBack={() => setPage(null)} title="정류장 탑승자" subtitle="3-2호차 · 등원" />;
    body = <StopRoster />;
  } else if (page === 'delay') {
    header = <AppHeader back onBack={() => setPage(null)} title="지연 알림" subtitle="3-2호차 · 등원" />;
    body = <DelayScreen onSend={() => setPage(null)} />;
  } else if (tab === 'home') {
    header = <AppHeader title="바래다 매니저" subtitle={role + ' · 3-2호차'} actions={<IconButton icon="bell" label="알림" tone="inverse" />} />;
    body = <ManagerHome role={role} onOpenDrive={() => setTab('drive')} onOpenStop={() => setPage('stop')} />;
  } else if (tab === 'drive') {
    header = <AppHeader title="운행모드" subtitle="3-2호차 · 등원 · 이동 중" actions={<IconButton icon="users-round" label="명단" tone="inverse" onClick={() => setPage('stop')} />} />;
    body = <DriveMode sent={sent} onSendArrive={() => setSent(true)} onOpenDelay={() => setPage('delay')} />;
  } else if (tab === 'map') {
    header = <AppHeader title="금일 노선 지도" subtitle="출발 30분 전 확정" />;
    body = <RouteMapScreen />;
  } else {
    header = <AppHeader title="운행 종료 리포트" subtitle="3-2호차 · 등원" />;
    body = <RunEndScreen />;
  }

  return (
    <div data-theme={theme} style={{ width: 390, height: 844, borderRadius: 28, overflow: 'hidden',
      background: 'var(--bg-base)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-raised)',
      display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {!signed ? (
        <ManagerLogin role={role} setRole={setRole} code={code} setCode={setCode} onSubmit={() => setSigned(true)} />
      ) : (
        <React.Fragment>
          {header}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>{body}</div>
          <TabBar items={tabs} value={tab} onChange={(v) => { setTab(v); setPage(null); }} />
        </React.Fragment>
      )}
    </div>
  );
}

function ManagerKitRoot() {
  const [theme, setTheme] = React.useState('dark');
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
      <ManagerApp theme={theme} />
      <div style={{ maxWidth: 300, paddingTop: 8 }}>
        <div style={{ font: 'var(--fw-bold) 11px/1 var(--font-sans)', letterSpacing: '.16em', color: 'var(--text-tertiary)' }}>DRIVER · ONBOARD MANAGER APP</div>
        <h2 style={{ marginTop: 12, fontSize: 26 }}>매니저 앱</h2>
        <div style={{ marginTop: 10, font: 'var(--fw-light) 14px/1.8 var(--font-sans)', color: 'var(--text-secondary)' }}>
          기본은 다크입니다 — 야간 하원과 운전 중 시인성을 위해서입니다.
        </div>
        <div style={{ marginTop: 16, maxWidth: 220 }}>
          <SegmentedControl options={[{ value: 'dark', label: '다크' }, { value: 'light', label: '라이트' }]} value={theme} onChange={setTheme} block />
        </div>
        <ul style={{ marginTop: 18, paddingLeft: 18, font: 'var(--fw-light) 13px/1.9 var(--font-sans)', color: 'var(--text-secondary)' }}>
          <li>로그인 — 버스기사/동승자 코드</li>
          <li>담당 노선 — 정류장 리스트, 탭하면 명단</li>
          <li>운행모드 — 현재/다음 정류장, 도착 알림 전송</li>
          <li>정류장 탑승자 — 탑승·미등원·하차, 일괄 처리</li>
          <li>지연 알림 — 사유 + 5분 단위, 문구 미리보기</li>
          <li>지도 — 금일 추가(초록)·삭제(빨강) 노선</li>
          <li>리포트 — 운행 종료 요약</li>
        </ul>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ManagerKitRoot />);
