const { Button, IconButton, Card, StatusPill, Badge, Icon,
  Input, Textarea, Select, Checkbox, SegmentedControl, SearchField,
  AlertBanner, Dialog, EmptyState,
  SideNav, PageHeader, StopTimeline, StudentRow, RosterTable, StatCard } = window.DesignSystem_9e66e1;

const W_STOPS = [
  { name: '한화아파트', address: '대치동 316-1', time: '8:37', state: 'done', riders: 4 },
  { name: '대치사거리', address: '대치동 902', time: '8:44', state: 'current', riders: 3, missed: 1 },
  { name: '은마아파트', address: '대치동 316', time: '8:51', state: 'next', riders: 5 },
  { name: '한빛학원 앞', address: '대치동 977', time: '8:58', state: 'upcoming' },
];

const BUSES = [
  { id: '3-1', bus: '3-1호차', leg: '등원', driver: '이강우', manager: '한소영', stops: 5, riders: 14, status: 'boarded', missed: 0 },
  { id: '3-2', bus: '3-2호차', leg: '등원', driver: '박정호', manager: '김윤정', stops: 4, riders: 12, status: 'moving', missed: 1 },
  { id: '3-3', bus: '3-3호차', leg: '등원', driver: '최민석', manager: '오지현', stops: 6, riders: 17, status: 'boarded', missed: 0 },
  { id: '3-4', bus: '3-4호차', leg: '등원', driver: '정해린', manager: '배수현', stops: 4, riders: 11, status: 'idle', missed: 0 },
];

const STUDENTS = [
  { id: 1, name: '김하준', klass: '3학년 2반', stop: '한화아파트', bus: '3-2호차', guardian: '010-2211-****', s: 'boarded', change: null, attend: '등원' },
  { id: 2, name: '박수민', klass: '4학년 1반', stop: '대치사거리', bus: '3-2호차', guardian: '010-3388-****', s: 'missed', change: null, attend: '등원' },
  { id: 3, name: '이서연', klass: '3학년 1반', stop: '은마아파트', bus: '3-2호차', guardian: '010-7742-****', s: 'idle', change: null, attend: '미등원' },
  { id: 4, name: '최다은', klass: '5학년 3반', stop: '선경아파트 정문', bus: '3-2호차', guardian: '010-9920-****', s: 'idle', change: 'added', attend: '등원' },
  { id: 5, name: '윤재희', klass: '4학년 2반', stop: '미도아파트', bus: '3-2호차', guardian: '010-5561-****', s: 'idle', change: 'removed', attend: '미등원' },
];

const MANAGERS = [
  { id: 1, name: '김윤정', role: '동승자', hours: '07:30 – 09:30 / 19:00 – 21:00', phone: '010-4412-****', bus: '3-2호차', code: 'MG-4K2P' },
  { id: 2, name: '박정호', role: '버스기사', hours: '07:00 – 10:00 / 18:30 – 21:30', phone: '010-8823-****', bus: '3-2호차', code: 'DR-9T1A' },
  { id: 3, name: '한소영', role: '동승자', hours: '07:30 – 09:30', phone: '010-2277-****', bus: '3-1호차', code: 'MG-7B3Z' },
];

function Dashboard({ onOpenRun }) {
  return (
    <div>
      <PageHeader title="운행 관리" description="2026년 8월 11일 화요일 · 등원 4개 노선 · 확정 탑승자 54명"
        actions={<><Button variant="secondary" icon="route">고정 노선</Button><Button icon="plus">노선 강제 추가</Button></>} />
      <div style={{ padding: '22px var(--gutter-desktop) 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="운행 중 노선" value={2} unit="개" icon="bus" sub="전체 4개 노선" />
        <StatCard label="탑승 완료" value={43} unit="명" tone="boarded" icon="circle-check" sub="확정 54명 중" />
        <StatCard label="미탑승" value={1} unit="명" tone="missed" icon="triangle-alert" sub="박수민 · 대치사거리" />
        <StatCard label="미등원" value={2} unit="명" icon="user-round" sub="보호자 사전 통보" />
      </div>
      <div style={{ padding: '18px var(--gutter-desktop) 0' }}>
        <AlertBanner tone="missed" title="박수민 학생이 대치사거리에서 탑승하지 않았어요"
          action={<div style={{ display: 'flex', gap: 8 }}><Button variant="danger" size="sm" icon="phone">보호자 연락</Button><Button variant="secondary" size="sm">미등원 처리</Button></div>}>
          정류장 도착 예정 시간은 8:44였습니다. 동승 매니저 김윤정에게도 함께 안내됐습니다.
        </AlertBanner>
      </div>
      <div style={{ padding: '20px var(--gutter-desktop) 0', display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        <div>
          <h3 style={{ fontSize: 19, marginBottom: 12 }}>금일 운행 현황</h3>
          <RosterTable onRowClick={onOpenRun} rows={BUSES} columns={[
            { key: 'bus', label: '호차', width: 92, render: (r) => <Badge tone="brand">{r.bus}</Badge> },
            { key: 'status', label: '상태', width: 116, render: (r) => <StatusPill status={r.status} showIcon={false}>{r.status === 'moving' ? '이동 중' : r.status === 'idle' ? '운행 전' : '정상 운행'}</StatusPill> },
            { key: 'driver', label: '기사' },
            { key: 'manager', label: '동승 매니저' },
            { key: 'riders', label: '탑승자', align: 'right', width: 80, render: (r) => r.riders + '명' },
            { key: 'missed', label: '미탑승', align: 'right', width: 80, render: (r) => r.missed ? <span style={{ color: 'var(--status-missed)', fontWeight: 700 }}>{r.missed}명</span> : '—' },
          ]} />
        </div>
        <div>
          <h3 style={{ fontSize: 19, marginBottom: 12 }}>3-2호차 실시간</h3>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <MapSurface height={168} stops={W_STOPS} busAt={0.42} />
            <div style={{ padding: 18 }}>
              <StopTimeline dense stops={W_STOPS} />
            </div>
          </Card>
        </div>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

function TodayRun({ bus, setBus }) {
  return (
    <div>
      <PageHeader title="금일 운행" description="출발 30분 전 확정 · 금일 추가는 초록, 삭제는 빨강으로 표시합니다"
        actions={<><Button variant="secondary" icon="plus">탑승자 강제 추가</Button><Button variant="secondary" icon="list">명단 내려받기</Button></>} />
      <div style={{ padding: '20px var(--gutter-desktop) 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {BUSES.map((b) => (
          <button key={b.id} type="button" onClick={() => setBus(b.id)}
            style={{
              height: 40, padding: '0 16px', cursor: 'pointer', borderRadius: 'var(--radius-pill)',
              border: '1px solid ' + (bus === b.id ? 'var(--accent-primary)' : 'var(--border-default)'),
              background: bus === b.id ? 'var(--accent-primary)' : 'var(--surface-card)',
              color: bus === b.id ? 'var(--text-inverse)' : 'var(--text-primary)',
              font: 'var(--fw-medium) var(--fs-label-sm)/1 var(--font-sans)',
            }}>{b.bus}</button>
        ))}
      </div>
      <div style={{ padding: '18px var(--gutter-desktop) 0', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }}>
        <RosterTable rows={STUDENTS} columns={[
          { key: 'name', label: '이름', width: 96 },
          { key: 'klass', label: '반', width: 96 },
          { key: 'stop', label: '정류장' },
          { key: 'guardian', label: '보호자', width: 140 },
          { key: 'attend', label: '등원 여부', width: 96, render: (r) => <span style={{ color: r.attend === '미등원' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{r.attend}</span> },
          { key: 's', label: '탑승 현황', width: 116, render: (r) => <StatusPill status={r.s} showIcon={false}>{r.s === 'boarded' ? '탑승 완료' : r.s === 'missed' ? '미탑승' : '대기'}</StatusPill> },
          { key: 'change', label: '금일 변경', width: 106, render: (r) => r.change === 'added' ? <Badge tone="added">추가</Badge> : r.change === 'removed' ? <Badge tone="removed">삭제</Badge> : '—' },
        ]} />
        <Card padding={18}>
          <div style={{ font: 'var(--fw-medium) 14px/1.4 var(--font-sans)' }}>노선별 정류장</div>
          <div style={{ marginTop: 14 }}><StopTimeline dense stops={W_STOPS} /></div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ font: 'var(--fw-light) 13px/1.7 var(--font-sans)', color: 'var(--text-secondary)' }}>
              기사 박정호 · 동승 매니저 김윤정<br />출발 8:30 · 도착 예정 8:58
            </div>
            <div style={{ marginTop: 12 }}><Button variant="secondary" size="sm" block icon="pencil">매니저 배치 변경</Button></div>
          </div>
        </Card>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

function Routes() {
  const [sel, setSel] = React.useState('3-2');
  return (
    <div>
      <PageHeader title="고정 노선" description="연초·신규 학생 등록 시 갱신합니다. 정류장 단위로 관리합니다"
        actions={<Button icon="plus">정류장 추가</Button>} />
      <div style={{ padding: '20px var(--gutter-desktop) 0', display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: 'var(--bg-subtle)', font: 'var(--fw-medium) 13px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>버스별 고정 노선</div>
          {BUSES.map((b) => (
            <button key={b.id} type="button" onClick={() => setSel(b.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
                background: sel === b.id ? 'var(--accent-primary-soft)' : 'transparent',
                border: 'none', borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ font: 'var(--fw-medium) 14px/1.3 var(--font-sans)' }}>{b.bus}</span>
              <span style={{ marginLeft: 'auto', font: 'var(--fw-light) 12.5px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{b.stops}개 정류장 · {b.riders}명</span>
            </button>
          ))}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 20 }}>{sel}호차 등원 노선</h3>
              <Badge tone="brand" style={{ marginLeft: 'auto' }}>출발 8:30</Badge>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <StopTimeline stops={W_STOPS} />
              <div>
                <div style={{ font: 'var(--fw-medium) 13px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>배치된 매니저</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MANAGERS.filter((m) => m.bus === sel + '호차').map((m) => (
                    <Card key={m.id} tone="outline" padding={14}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ font: 'var(--fw-medium) 14px/1.3 var(--font-sans)' }}>{m.name}</span>
                        <Badge>{m.role}</Badge>
                        <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }}>변경</Button>
                      </div>
                      <div style={{ marginTop: 6, font: 'var(--fw-light) 12.5px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>근무 {m.hours}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

function Students({ onAdd }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const rows = STUDENTS.filter((s) => s.name.includes(q));
  return (
    <div>
      <PageHeader title="학생 정보 관리" description="이름으로 검색하고, 행을 눌러 학생 정보를 확인합니다"
        actions={<Button icon="plus" onClick={onAdd}>학생 추가</Button>} />
      <div style={{ padding: '20px var(--gutter-desktop) 0', maxWidth: 420 }}>
        <SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="학생 이름" />
      </div>
      <div style={{ padding: '18px var(--gutter-desktop) 0', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start' }}>
        {rows.length ? (
          <RosterTable onRowClick={setSel} rows={rows} columns={[
            { key: 'name', label: '이름', width: 100 },
            { key: 'klass', label: '반', width: 100 },
            { key: 'stop', label: '탑승 정류장' },
            { key: 'bus', label: '호차', width: 96 },
            { key: 'guardian', label: '보호자 연락처', width: 150 },
          ]} />
        ) : (
          <Card><EmptyState icon="search" title="검색 결과가 없어요">이름을 다시 확인해 주세요.</EmptyState></Card>
        )}
        {sel ? (
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 20 }}>{sel.name}</h3>
              <IconButton icon="x" label="닫기" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)} />
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['반', sel.klass], ['탑승 정류장', sel.stop], ['호차', sel.bus], ['보호자 연락처', sel.guardian], ['등원 여부', sel.attend], ['학부모 코드', 'PR-' + sel.id + 'H8QK']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, font: 'var(--fw-regular) 14px/1.6 var(--font-sans)' }}>
                  <span style={{ width: 96, flex: 'none', color: 'var(--text-secondary)', fontWeight: 300 }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ font: 'var(--fw-light) 12.5px/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>특이사항 · 수요일은 할머니가 은마아파트로 데리러 오십니다.</div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon="pencil" style={{ flex: 1 }}>개인정보 수정</Button>
              <Button variant="danger" size="sm" icon="trash-2">삭제</Button>
            </div>
          </Card>
        ) : (
          <Card padding={20}>
            <EmptyState icon="user-round" title="학생을 선택해 주세요">왼쪽 표에서 이름을 누르면 상세 정보가 열립니다.</EmptyState>
          </Card>
        )}
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

function StudentAdd({ onCancel, onSave, savedCode }) {
  return (
    <div>
      <PageHeader title="학생 추가" description="저장하면 학부모 코드와 학생 코드가 함께 발급됩니다" />
      <div style={{ padding: '20px var(--gutter-desktop) 0', maxWidth: 880 }}>
        {savedCode ? (
          <div style={{ marginBottom: 18 }}>
            <AlertBanner tone="boarded" title="학생 정보가 추가됐습니다">
              학부모 코드 <b>{savedCode}</b> · 학생 코드 <b>ST-{savedCode.slice(-4)}</b> — 보호자에게 전달해 주세요.
            </AlertBanner>
          </div>
        ) : null}
        <Card padding={24}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="학생 이름" placeholder="예: 김하준" required />
            <Input label="영문 이름 (선택)" placeholder="Kim Hajun" />
            <Input label="생년월일" placeholder="2016-03-04" required />
            <Input label="보호자 전화번호" icon="phone" placeholder="010-0000-0000" required />
            <Input label="학원 반" placeholder="3학년 2반" />
            <Select label="배정 호차" options={['3-1호차', '3-2호차', '3-3호차', '3-4호차']} />
            <Input label="주소" placeholder="서울 강남구 대치동 316-1" wrapStyle={{ gridColumn: '1 / -1' }} />
            <Textarea label="특이사항" wrapStyle={{ gridColumn: '1 / -1' }}
              hint="예: 수요일은 할머니가 은마아파트로 데리러 오십니다" rows={3} />
          </div>
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ font: 'var(--fw-medium) 14px/1.4 var(--font-sans)' }}>요일별 하원 위치가 다를 때</div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
              <Select options={['월요일', '화요일', '수요일', '목요일', '금요일']} />
              <Input placeholder="특정 요일 하원 주소" />
            </div>
          </div>
          <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onCancel}>취소</Button>
            <Button onClick={onSave}>저장</Button>
          </div>
        </Card>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

function Managers() {
  const [q, setQ] = React.useState('');
  const [del, setDel] = React.useState(null);
  const rows = MANAGERS.filter((m) => m.name.includes(q));
  return (
    <div style={{ position: 'relative' }}>
      <PageHeader title="매니저 관리" description="버스기사와 동승자를 등록하고 근무 시간을 관리합니다"
        actions={<Button icon="plus">매니저 추가</Button>} />
      <div style={{ padding: '20px var(--gutter-desktop) 0', maxWidth: 420 }}>
        <SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="매니저 이름" />
      </div>
      <div style={{ padding: '18px var(--gutter-desktop) 0' }}>
        <RosterTable rows={rows} columns={[
          { key: 'name', label: '이름', width: 100 },
          { key: 'role', label: '역할', width: 110, render: (r) => <Badge tone={r.role === '버스기사' ? 'brand' : 'neutral'}>{r.role}</Badge> },
          { key: 'hours', label: '근무 시간' },
          { key: 'phone', label: '전화번호', width: 150 },
          { key: 'bus', label: '배치', width: 100 },
          { key: 'code', label: '발급 코드', width: 120 },
          { key: 'act', label: '', width: 130, align: 'right', render: (r) => (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm">수정</Button>
              <Button variant="ghost" size="sm" onClick={() => setDel(r)} style={{ color: 'var(--status-missed)' }}>삭제</Button>
            </div>
          ) },
        ]} />
      </div>
      <Dialog open={!!del} title={del ? del.name + ' 매니저를 삭제할까요?' : ''} onClose={() => setDel(null)}
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>취소</Button><Button variant="danger" onClick={() => setDel(null)}>삭제</Button></>}>
        배치된 노선에서 함께 해제되고 발급 코드는 즉시 사용할 수 없게 됩니다.
      </Dialog>
      <div style={{ height: 32 }} />
    </div>
  );
}

function Logs() {
  const LOGS = [
    { t: '8:44', k: 'missed', title: '박수민 미탑승', body: '대치사거리 · 3-2호차 · 보호자 알림 전송', who: '자동' },
    { t: '8:41', k: 'moving', title: '도착 지연 알림 전송', body: '도로 정체 · 5분 · 남은 정류장 2곳 보호자 8명', who: '김윤정 (동승자)' },
    { t: '8:37', k: 'boarded', title: '김하준 승차', body: '한화아파트 · 3-2호차', who: '김윤정 (동승자)' },
    { t: '8:30', k: 'boarded', title: '3-2호차 운행 시작', body: '확정 탑승자 12명 · 정류장 4곳', who: '박정호 (기사)' },
    { t: '8:02', k: 'idle', title: '이서연 미등원 처리', body: '보호자 사전 통보 · 등원 제외', who: '보호자 앱' },
  ];
  return (
    <div>
      <PageHeader title="알림 로그" description="전송된 알림과 처리 내역을 시간 역순으로 봅니다"
        actions={<Select options={['오늘', '이번 주', '이번 달']} wrapStyle={{ width: 140 }} />} />
      <div style={{ padding: '20px var(--gutter-desktop) 0', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LOGS.map((l, i) => (
          <Card key={i} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ font: 'var(--fw-bold) 15px/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums', width: 46, color: 'var(--text-secondary)' }}>{l.t}</span>
              <StatusPill status={l.k} showIcon={false}>{l.k === 'missed' ? '미탑승' : l.k === 'moving' ? '지연' : l.k === 'idle' ? '미등원' : '정상'}</StatusPill>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: 'var(--fw-medium) 14px/1.4 var(--font-sans)' }}>{l.title}</div>
                <div style={{ font: 'var(--fw-light) 12.5px/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>{l.body}</div>
              </div>
              <span style={{ font: 'var(--fw-light) 12.5px/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>{l.who}</span>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

Object.assign(window, { WebDashboard: Dashboard, WebTodayRun: TodayRun, WebRoutes: Routes, WebStudents: Students, WebStudentAdd: StudentAdd, WebManagers: Managers, WebLogs: Logs });
