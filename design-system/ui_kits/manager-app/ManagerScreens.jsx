const { Button, IconButton, Card, StatusPill, Badge, Icon,
  Input, Textarea, Select, SegmentedControl, CodeInput, Checkbox,
  AlertBanner, BottomSheet, EmptyState, Dialog,
  AppHeader, TabBar, StopTimeline, StudentRow, RunSummaryCard, DelayPicker, StatCard } = window.DesignSystem_9e66e1;

const M_STOPS = [
  { name: '한화아파트', address: '대치동 316-1', time: '8:37', state: 'done', riders: 4 },
  { name: '대치사거리', address: '대치동 902', time: '8:44', state: 'current', riders: 3, missed: 1 },
  { name: '은마아파트', address: '대치동 316', time: '8:51', state: 'next', riders: 5 },
  { name: '한빛학원 앞', address: '대치동 977', time: '8:58', state: 'upcoming', riders: 0 },
];

const ROSTER = [
  { name: '김하준', meta: '3학년 2반 · 보호자 010-2211-****', ride: 'boarded' },
  { name: '박수민', meta: '4학년 1반 · 보호자 010-3388-****', ride: 'waiting' },
  { name: '이서연', meta: '3학년 1반 · 보호자 010-7742-****', ride: 'absent' },
];

function ManagerLogin({ role, setRole, code, setCode, onSubmit, error }) {
  return (
    <div style={{ height: '100%', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', padding: '56px 22px 26px' }}>
      <div style={{ font: 'var(--fw-bold) 11px/1 var(--font-sans)', letterSpacing: '.18em', color: 'var(--accent-primary)' }}>BARAEDA MANAGER</div>
      <div style={{ marginTop: 14, font: 'var(--fw-bold) 30px/1.3 var(--font-serif)', letterSpacing: '-.02em', color: 'var(--text-primary)' }}>
        오늘 운행을<br />시작합니다
      </div>
      <div style={{ marginTop: 10, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
        부여된 코드로 로그인하면 담당 노선이 바로 열립니다.
      </div>
      <div style={{ marginTop: 30 }}>
        <SegmentedControl options={['버스기사', '동승자']} value={role} onChange={setRole} block />
      </div>
      <div style={{ marginTop: 18 }}>
        <CodeInput label={role + ' 코드'} value={code} onChange={setCode} error={error}
          hint={error ? undefined : '학원에서 받은 6자리 코드를 입력해 주세요'} />
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Button size="lg" block onClick={onSubmit} disabled={code.length < 6}>로그인</Button>
      </div>
    </div>
  );
}

function ManagerHome({ role, onOpenDrive, onOpenStop }) {
  return (
    <div>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ font: 'var(--fw-light) 13px/1.4 var(--font-sans)', color: 'var(--text-secondary)' }}>8월 11일 화요일 · 등원</div>
        <h2 style={{ marginTop: 4, fontSize: 25 }}>담당 운행 노선</h2>
      </div>
      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 10 }}>
        <StatCard style={{ flex: 1 }} label="확정 탑승자" value={12} unit="명" icon="users-round" sub="정류장 4곳" />
        <StatCard style={{ flex: 1 }} label="미탑승" value={1} unit="명" tone="missed" icon="triangle-alert" />
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        <Card padding={18} onClick={onOpenDrive}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="brand">3-2호차</Badge>
            <StatusPill status="moving">이동 중</StatusPill>
            <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}><Icon name="chevron-right" size={18} /></span>
          </div>
          <div style={{ marginTop: 12, font: 'var(--fw-bold) 21px/1.35 var(--font-serif)', letterSpacing: '-.015em' }}>등원 · 한화아파트 → 한빛학원</div>
          <div style={{ marginTop: 6, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
            출발 8:30 · 기사 박정호 · 동승 매니저 김윤정
          </div>
        </Card>
      </div>
      <div style={{ padding: '20px 20px 8px' }}>
        <h3 style={{ fontSize: 18 }}>정류장 리스트</h3>
        <div style={{ marginTop: 4, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
          정류장을 누르면 탑승자 명단이 열립니다.
        </div>
      </div>
      <div style={{ padding: '8px 20px 24px' }}>
        <Card padding={18}>
          <StopTimeline stops={M_STOPS} onSelect={onOpenStop} />
        </Card>
      </div>
      <div style={{ padding: '0 20px 26px' }}>
        <Button size="lg" block icon="navigation" onClick={onOpenDrive}>운행모드 시작</Button>
      </div>
    </div>
  );
}

function DriveMode({ onSendArrive, onOpenDelay, sent }) {
  return (
    <div>
      <MapSurface height={190} dark stops={M_STOPS} busAt={0.42} />
      <div style={{ padding: '16px 20px 0' }}>
        {sent ? (
          <div style={{ marginBottom: 12 }}>
            <AlertBanner tone="boarded" title="도착 알림을 보냈습니다">
              은마아파트 탑승자 5명의 보호자에게 전송됐습니다.
            </AlertBanner>
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Card tone="mist" padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'var(--fw-medium) 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
              <Icon name="navigation" size={13} />현재 이동 중
            </div>
            <div style={{ marginTop: 8, font: 'var(--fw-bold) 18px/1.3 var(--font-sans)' }}>대치사거리</div>
            <div style={{ marginTop: 3, font: 'var(--fw-light) 12px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>대치동 902</div>
          </Card>
          <Card tone="mist" padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'var(--fw-medium) 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
              <Icon name="map-pin" size={13} />다음 정류장
            </div>
            <div style={{ marginTop: 8, font: 'var(--fw-bold) 18px/1.3 var(--font-sans)' }}>은마아파트</div>
            <div style={{ marginTop: 3, font: 'var(--fw-light) 12px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>대치동 316</div>
          </Card>
        </div>
      </div>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button size="lg" block icon="bell" onClick={onSendArrive}>도착 알림 전송</Button>
        <Button size="lg" block variant="secondary" icon="clock" onClick={onOpenDelay}>도착 지연 알림 전송</Button>
      </div>
      <div style={{ padding: '22px 20px 8px' }}>
        <h3 style={{ fontSize: 17 }}>다음 정류장 탑승 명단</h3>
      </div>
      <div style={{ padding: '4px 20px 26px' }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {ROSTER.map((r, i) => (
            <StudentRow key={r.name} {...r} style={i === ROSTER.length - 1 ? { borderBottom: 'none' } : null} />
          ))}
        </Card>
      </div>
    </div>
  );
}

function StopRoster({ onBulk }) {
  const [rows, setRows] = React.useState(ROSTER.map((r) => ({ ...r })));
  const set = (i, ride) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ride } : r)));
  const rideBtn = (i, r) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[['boarded', '탑승'], ['absent', '미등원'], ['alighted', '하차']].map(([v, l]) => (
        <button key={v} type="button" onClick={() => set(i, v)}
          style={{
            height: 32, padding: '0 10px', cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid ' + (r.ride === v ? 'var(--accent-primary)' : 'var(--border-subtle)'),
            background: r.ride === v ? 'var(--accent-primary-soft)' : 'transparent',
            color: r.ride === v ? 'var(--text-brand)' : 'var(--text-secondary)',
            font: 'var(--fw-medium) 12px/1 var(--font-sans)',
          }}>{l}</button>
      ))}
    </div>
  );
  return (
    <div>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 23 }}>대치사거리</h2>
          <StatusPill status="moving" style={{ marginLeft: 'auto' }}>이동 중</StatusPill>
        </div>
        <div style={{ marginTop: 6, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
          대치동 902 · 도착 예정 8:44 · 확정 탑승자 3명
        </div>
      </div>
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8 }}>
        <Button variant="soft" style={{ flex: 1 }} onClick={() => setRows((rs) => rs.map((r) => ({ ...r, ride: 'boarded' })))}>일괄 탑승</Button>
        <Button variant="secondary" style={{ flex: 1 }} onClick={() => setRows((rs) => rs.map((r) => ({ ...r, ride: 'alighted' })))}>일괄 하차</Button>
      </div>
      <div style={{ padding: '14px 20px 26px' }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <StudentRow key={r.name} name={r.name} meta={r.meta} ride={r.ride} actions={rideBtn(i, r)}
              style={i === rows.length - 1 ? { borderBottom: 'none' } : null} />
          ))}
        </Card>
        <div style={{ marginTop: 14 }}>
          <AlertBanner tone="missed" title="박수민 학생이 아직 타지 않았어요"
            action={<Button variant="danger" size="sm" icon="phone">보호자에게 연락</Button>}>
            정류장 도착 예정 시간은 8:44입니다.
          </AlertBanner>
        </div>
      </div>
    </div>
  );
}

function DelayScreen({ onSend }) {
  const [min, setMin] = React.useState(null);
  const [reason, setReason] = React.useState('도로 정체');
  return (
    <div style={{ padding: '18px 20px 26px' }}>
      <h2 style={{ fontSize: 23 }}>도착 지연 알림</h2>
      <div style={{ marginTop: 8, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
        남은 정류장 탑승자의 보호자에게 지연 시간과 사유가 함께 전송됩니다.
      </div>
      <div style={{ marginTop: 20 }}>
        <Select label="지연 사유" options={['도로 정체', '기상 상황', '차량 점검', '이전 정류장 대기']}
          value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div style={{ marginTop: 18 }}>
        <DelayPicker value={min} onChange={setMin} />
      </div>
      <div style={{ marginTop: 18 }}>
        <Card tone="mist" padding={16}>
          <div style={{ font: 'var(--fw-medium) 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>보호자에게 이렇게 갑니다</div>
          <div style={{ marginTop: 8, font: 'var(--fw-regular) 15px/1.7 var(--font-sans)' }}>
            {min ? '약 ' + min + '분 후 도착합니다. ' + reason + '으로 3-2호차가 ' + min + '분 늦어지고 있습니다.' : '지연 시간을 선택하면 문구가 만들어집니다.'}
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 20 }}>
        <Button size="lg" block disabled={!min} onClick={onSend}>지연 알림 전송</Button>
      </div>
    </div>
  );
}

function RouteMapScreen() {
  return (
    <div>
      <MapSurface height={300} dark stops={M_STOPS} busAt={0.42} />
      <div style={{ padding: '18px 20px 0' }}>
        <h3 style={{ fontSize: 19 }}>금일 확정 노선</h3>
        <div style={{ marginTop: 6, font: 'var(--fw-light) 13px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
          출발 30분 전에 확정됩니다. 변경분은 색으로 구분합니다.
        </div>
      </div>
      <div style={{ padding: '14px 20px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card padding={16} accent="boarded">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="added">신규 추가</Badge>
            <span style={{ marginLeft: 'auto', font: 'var(--fw-bold) 13px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>8:47</span>
          </div>
          <div style={{ marginTop: 8, font: 'var(--fw-medium) 15px/1.4 var(--font-sans)' }}>선경아파트 정문</div>
          <div style={{ marginTop: 2, font: 'var(--fw-light) 12.5px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>강제 추가 · 1명 · 대치동 908</div>
        </Card>
        <Card padding={16} accent="missed">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="removed">금일 삭제</Badge>
            <span style={{ marginLeft: 'auto', font: 'var(--fw-bold) 13px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>—</span>
          </div>
          <div style={{ marginTop: 8, font: 'var(--fw-medium) 15px/1.4 var(--font-sans)', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>미도아파트</div>
          <div style={{ marginTop: 2, font: 'var(--fw-light) 12.5px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>탑승자 전원 미등원</div>
        </Card>
      </div>
    </div>
  );
}

function RunEndScreen() {
  return (
    <div style={{ padding: '18px 20px 26px' }}>
      <h2 style={{ fontSize: 24 }}>오늘 운행을 마쳤습니다</h2>
      <div style={{ marginTop: 8, font: 'var(--fw-light) 14px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
        8월 11일 등원 · 3-2호차 · 8:30 출발 / 9:02 도착
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <StatCard style={{ flex: 1 }} label="탑승 완료" value={11} unit="명" tone="boarded" icon="circle-check" />
        <StatCard style={{ flex: 1 }} label="미등원" value={1} unit="명" icon="user-round" />
      </div>
      <div style={{ marginTop: 12 }}>
        <StatCard label="미탑승" value={0} unit="명" icon="triangle-alert" sub="미탑승 없이 종료됐습니다" />
      </div>
      <div style={{ marginTop: 18 }}>
        <Card padding={18}>
          <div style={{ font: 'var(--fw-medium) 14px/1.4 var(--font-sans)' }}>정류장 기록</div>
          <div style={{ marginTop: 12 }}><StopTimeline dense stops={M_STOPS.map((s) => ({ ...s, state: 'done' }))} /></div>
        </Card>
      </div>
      <div style={{ marginTop: 18 }}>
        <Button size="lg" block variant="secondary">학원에 리포트 전송</Button>
      </div>
    </div>
  );
}

Object.assign(window, { ManagerLogin, ManagerHome, DriveMode, StopRoster, DelayScreen, RouteMapScreen, RunEndScreen });
