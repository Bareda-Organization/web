const { Button, IconButton, Card, StatusPill, Badge, Icon,
  Input, Select, Switch, SegmentedControl, CodeInput,
  AlertBanner, NotificationCard, BottomSheet, EmptyState,
  AppHeader, TabBar, StopTimeline, RunSummaryCard } = window.DesignSystem_9e66e1;

const STOPS = [
  { name: '한화아파트', address: '대치동 316-1', time: '8:37', state: 'done', riders: 4 },
  { name: '대치사거리', address: '대치동 902', time: '8:44', state: 'current', riders: 3, missed: 1 },
  { name: '은마아파트', address: '대치동 316', time: '8:51', state: 'next', riders: 5 },
  { name: '한빛학원 앞', address: '대치동 977', time: '8:58', state: 'upcoming', riders: 0 },
];

function LoginScreen({ role, setRole, code, setCode, onSubmit }) {
  return (
    <div style={{ height: '100%', background: 'var(--green-600)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 24px 0' }}>
        <div style={{ font: 'var(--fw-bold) 11px/1 var(--font-sans)', letterSpacing: '.18em', color: 'var(--green-200)' }}>BARAEDA</div>
        <div style={{ marginTop: 14, font: 'var(--fw-black) 34px/1.25 var(--font-serif)', letterSpacing: '-.03em', color: 'var(--off-white)' }}>
          잘 탔고,<br />잘 내렸습니다
        </div>
        <div style={{ marginTop: 12, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--green-200)' }}>
          바래다주지 못하는 날에도, 바래다준 것처럼.
        </div>
      </div>
      <div style={{ marginTop: 'auto', background: 'var(--bg-base)', borderRadius: '24px 24px 0 0', padding: '26px 20px 28px' }}>
        <SegmentedControl options={['학부모', '학생']} value={role} onChange={setRole} block />
        <div style={{ marginTop: 18 }}>
          <CodeInput label={role + ' 코드'} value={code} onChange={setCode}
            hint="학원에서 받은 6자리 코드를 입력해 주세요" />
        </div>
        <div style={{ marginTop: 18 }}>
          <Button size="lg" block onClick={onSubmit} disabled={code.length < 6}>로그인</Button>
        </div>
        <div style={{ marginTop: 14, textAlign: 'center', font: 'var(--fw-light) 13px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>
          코드를 모르시면 학원 데스크에 문의해 주세요.
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ role, attend, setAttend, onOpenMap, onOpenRoute }) {
  return (
    <div>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ font: 'var(--fw-light) 13px/1.4 var(--font-sans)', color: 'var(--text-secondary)' }}>8월 11일 화요일 · 등원</div>
        <h2 style={{ marginTop: 4, fontSize: 26 }}>{role === '학생' ? '오늘도 잘 다녀오세요' : '하준이의 오늘'}</h2>
      </div>
      <div style={{ padding: '16px 20px 0' }}>
        <AlertBanner tone="moving" title="약 5분 후 도착합니다">
          도로 상황으로 3-2호차가 5분 늦어지고 있습니다.
        </AlertBanner>
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        <RunSummaryCard bus="3-2호차" leg="등원" status="moving" statusLabel="이동 중 · 지연"
          eta="약 5분 후 도착합니다" currentStop="대치사거리" nextStop="은마아파트"
          driver="박정호" manager="김윤정" onClick={onOpenMap} />
      </div>
      {role === '학부모' ? (
        <div style={{ padding: '12px 20px 0' }}>
          <Card padding={16}>
            <Select label="오늘 학원 등원 여부" options={['등원', '미등원']} value={attend}
              onChange={(e) => setAttend(e.target.value)} />
            <div style={{ marginTop: 10, font: 'var(--fw-light) 13px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>
              미등원으로 두면 기사와 동승 매니저에게 함께 안내됩니다.
            </div>
          </Card>
        </div>
      ) : null}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ fontSize: 20 }}>알림</h3>
        <Button variant="ghost" size="sm" iconEnd="chevron-right" style={{ marginLeft: 'auto' }} onClick={onOpenRoute}>노선 자세히 보기</Button>
      </div>
      <div style={{ padding: '10px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <NotificationCard status="boarded" title="하준이가 승차했어요" meta="8:37 · 한화아파트 정류장"
          sub="도착 예정 8:58" time="방금" unread />
        <NotificationCard status="moving" statusLabel="이동 중 · 지연" title="약 5분 후 도착합니다"
          meta="현재 위치 · 대치사거리" time="2분 전" />
        <NotificationCard status="boarded" statusLabel="하차 완료" title="어제 하원, 잘 내렸습니다"
          meta="20:14 · 한화아파트 정류장" sub="동승 매니저가 아파트 정문까지 함께 내렸습니다" time="어제" />
      </div>
    </div>
  );
}

function LiveMapScreen({ sheetOpen, setSheetOpen }) {
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <MapSurface height={520} stops={STOPS} busAt={0.42} />
      <div style={{ position: 'absolute', left: 16, right: 16, top: 16 }}>
        <Card padding={14} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill status="moving">이동 중</StatusPill>
          <div style={{ font: 'var(--fw-medium) 14px/1.3 var(--font-sans)' }}>현재 위치 · 대치사거리</div>
          <span style={{ marginLeft: 'auto', font: 'var(--fw-bold) 14px/1 var(--font-sans)', color: 'var(--status-moving)' }}>약 5분</span>
        </Card>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface-card)',
        borderRadius: '24px 24px 0 0', boxShadow: 'var(--shadow-sheet)', padding: '14px 20px 20px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--stone-200)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 19 }}>3-2호차 · 등원</h3>
          <Badge tone="brand" style={{ marginLeft: 'auto' }}>도착 예정 8:58</Badge>
        </div>
        <StopTimeline dense stops={STOPS} onSelect={() => setSheetOpen(true)} />
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="phone" style={{ flex: 1 }}>기사에게 연락</Button>
          <Button style={{ flex: 1 }} onClick={() => setSheetOpen(true)}>정류장 보기</Button>
        </div>
      </div>
      <BottomSheet open={sheetOpen} title="대치사거리" onClose={() => setSheetOpen(false)}>
        <div style={{ font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>대치동 902 · 도착 예정 8:44</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <Card tone="mist" padding={14} style={{ flex: 1 }}>
            <div style={{ font: 'var(--fw-medium) 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>탑승 인원</div>
            <div style={{ marginTop: 6, font: 'var(--fw-bold) 22px/1 var(--font-sans)' }}>3명</div>
          </Card>
          <Card tone="mist" padding={14} style={{ flex: 1 }}>
            <div style={{ font: 'var(--fw-medium) 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>미탑승</div>
            <div style={{ marginTop: 6, font: 'var(--fw-bold) 22px/1 var(--font-sans)', color: 'var(--status-missed)' }}>1명</div>
          </Card>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button block onClick={() => setSheetOpen(false)}>닫기</Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function RouteDetailScreen() {
  return (
    <div>
      <MapSurface height={180} stops={STOPS} busAt={0.42} />
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 21 }}>3-2호차 고정 노선</h3>
          <Badge tone="brand" style={{ marginLeft: 'auto' }}>등원 4개 정류장</Badge>
        </div>
        <div style={{ marginTop: 6, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
          기사 박정호 · 동승 매니저 김윤정 · 출발 8:30
        </div>
      </div>
      <div style={{ padding: '16px 20px 24px' }}>
        <Card padding={18}>
          <StopTimeline stops={STOPS} />
        </Card>
        <div style={{ marginTop: 12 }}>
          <Card tone="mist" padding={16}>
            <div style={{ font: 'var(--fw-medium) 14px/1.4 var(--font-sans)' }}>하준이의 탑승 정류장</div>
            <div style={{ marginTop: 4, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
              한화아파트 · 등원 8:37 / 하원 20:14
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScheduleScreen({ onDone }) {
  const [stop, setStop] = React.useState('한화아파트');
  return (
    <div style={{ padding: '18px 20px 24px' }}>
      <h2 style={{ fontSize: 24 }}>탑승 위치 변경</h2>
      <div style={{ marginTop: 8, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
        변경한 위치는 학원 확인 후 적용됩니다. 오늘 운행에는 반영되지 않습니다.
      </div>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="변경할 요일" options={['매일', '월요일', '화요일', '수요일', '목요일', '금요일']} />
        <Select label="탑승 정류장" options={['한화아파트', '대치사거리', '은마아파트']} value={stop} onChange={(e) => setStop(e.target.value)} />
        <Input label="상세 주소" defaultValue="대치동 316-1 한화아파트 정문" />
        <Input label="변경 사유 (선택)" placeholder="예: 수요일은 할머니 집에서 하원합니다" />
      </div>
      <div style={{ marginTop: 22 }}>
        <Button size="lg" block onClick={onDone}>변경 신청</Button>
      </div>
    </div>
  );
}

function SettingsScreen({ role }) {
  const [arrive, setArrive] = React.useState(true);
  const [ride, setRide] = React.useState(true);
  const [attend, setAttend] = React.useState(role === '학부모');
  return (
    <div style={{ padding: '18px 20px 24px' }}>
      <h2 style={{ fontSize: 24 }}>알림 설정</h2>
      <div style={{ marginTop: 8, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
        끈 알림은 앱 안에서만 확인할 수 있습니다.
      </div>
      <Card padding={4} style={{ marginTop: 18 }}>
        <div style={{ padding: '4px 16px' }}>
          <Switch checked={arrive} onChange={(e) => setArrive(e.target.checked)}
            label="버스 도착 알림" sublabel="정류장 2개 전에 알려드립니다" />
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <Switch checked={ride} onChange={(e) => setRide(e.target.checked)}
            label="등하원 알림" sublabel="승차·하차 시각을 알려드립니다" />
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <Switch checked disabled label="도착 지연 알림" sublabel="안전을 위해 끌 수 없습니다" />
          {role === '학부모' ? (
            <React.Fragment>
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <Switch checked={attend} onChange={(e) => setAttend(e.target.checked)}
                label="미탑승 알림" sublabel="정류장에서 탑승이 확인되지 않으면 바로 알려드립니다" />
            </React.Fragment>
          ) : null}
        </div>
      </Card>
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 18 }}>내 정보</h3>
        <Card padding={16} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-brand)', display: 'grid', placeItems: 'center', font: 'var(--fw-bold) 15px var(--font-sans)' }}>하준</span>
            <div>
              <div style={{ font: 'var(--fw-medium) 15px/1.4 var(--font-sans)' }}>김하준</div>
              <div style={{ font: 'var(--fw-light) 13px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>한빛학원 3학년 2반 · 3-2호차</div>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}><Icon name="chevron-right" size={18} /></span>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, HomeScreen, LiveMapScreen, RouteDetailScreen, ScheduleScreen, SettingsScreen, PARENT_STOPS: STOPS });
