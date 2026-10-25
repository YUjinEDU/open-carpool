import { describe, expect, it } from 'vitest';
import type { Crew, Member, Trip } from '../../domain/types';
import { CO2_KG_PER_KM, crewRows, csvFilename, dashboardRanges, groupStats, monthLabel, monthRange, recentMonths, tripsCsv, tripsInRange, type CrewTrips, type CsvLabels } from './stats';

const TODAY = '2026-10-24';
const OCT = monthRange('2026-10');
const KO_LABELS: CsvLabels = {
  columns: { date: '날짜', leg: '구간', crew: '크루', driver: '운전자', riders: '탑승자', absent: '결석', status: '상태', completedBy: '완료자', completedAt: '완료 시각', cost: '비용', currency: '통화' },
  leg: { out: '출발', back: '귀가' },
  status: { planned: '예정', needs_driver: '운전자 필요', done: '완료', cancelled: '취소' },
};
const HOME = { lat: 36.35, lng: 127.38 };
const DEST = { lat: 36.36, lng: 127.38, label: 'Office' }; // 0.01 deg lat north, about 1.11 km

const member = (uid: string, over: Partial<Member> = {}): Member => ({
  uid,
  displayName: uid.toUpperCase(),
  role: 'member',
  status: 'active',
  canDrive: true,
  seats: 3,
  plateLastDigit: null,
  areaLabel: '',
  area: null,
  schedule: {},
  joinedAt: '2026-01-01T00:00:00Z',
  inviteCode: 'X',
  ...over,
});

const crew = (id: string, over: Partial<Crew> = {}): Crew => ({
  id,
  name: id,
  memberIds: ['a', 'b'],
  captainId: 'a',
  backupDriverIds: [],
  acceptedIds: ['a', 'b'],
  status: 'active',
  days: [1],
  outTime: '08:00',
  backTime: null,
  pickupNote: '',
  waitLimitMin: 5,
  scores: {},
  lastDroveOn: {},
  createdBy: 'a',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

const trip = (date: string, over: Partial<Trip> = {}): Trip => ({
  id: `${date}_out`,
  date,
  leg: 'out',
  driverId: 'a',
  riderIds: ['b'],
  absentIds: [],
  status: 'done',
  applied: true,
  completedBy: 'a',
  completedAt: `${date}T09:00:00Z`,
  cost: null,
  ...over,
});

describe('groupStats', () => {
  const members = [member('a'), member('b'), member('c'), member('gone', { status: 'left' })];

  it('counts done trips inside the selected period only', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-20'), trip('2026-09-24'), trip('2026-09-25'), trip('2026-10-21', { status: 'planned' })] }];
    expect(groupStats({ group: { destination: null }, members, crews, range: OCT }).tripsDone).toBe(1);
    expect(groupStats({ group: { destination: null }, members, crews, range: monthRange('2026-09') }).tripsDone).toBe(2);
  });

  it('divides members who travelled by active members', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-20')] }];
    expect(groupStats({ group: { destination: null }, members, crews, range: OCT }).participationRate).toBeCloseTo(2 / 3);
  });

  it('divides riders by the driver seats on done trips', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-20'), trip('2026-10-21', { riderIds: ['b', 'c'] })] }];
    expect(groupStats({ group: { destination: null }, members, crews, range: OCT }).seatsFilled).toBeCloseTo(3 / 6);
  });

  it('reports no ratios when there are no members and no done trips', () => {
    const stats = groupStats({ group: { destination: null }, members: [], crews: [], range: OCT });
    expect([stats.participationRate, stats.seatsFilled]).toEqual([null, null]);
  });

  it('counts active crews', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [] }, { crew: crew('y', { status: 'proposed' }), trips: [] }];
    expect(groupStats({ group: { destination: null }, members, crews, range: OCT }).activeCrews).toBe(1);
  });

  it('estimates distance per rider with the road factor and CO2 per km', () => {
    const withArea = [member('a'), member('b', { area: HOME })];
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-20'), trip('2026-10-21')] }];
    const estimate = groupStats({ group: { destination: DEST }, members: withArea, crews, range: OCT }).estimate;
    expect(estimate?.distanceKm).toBeCloseTo(2 * 1.112 * 1.3, 1);
    expect(estimate?.co2Kg).toBeCloseTo((estimate?.distanceKm ?? 0) * CO2_KG_PER_KM);
  });

  it('gives no estimate without a destination or without any member area', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-20')] }];
    expect(groupStats({ group: { destination: null }, members: [member('b', { area: HOME })], crews, range: OCT }).estimate).toBeNull();
    expect(groupStats({ group: { destination: DEST }, members, crews, range: OCT }).estimate).toBeNull();
  });
});

describe('crewRows', () => {
  it('reports the ledger spread in rides', () => {
    const [row] = crewRows([{ crew: crew('x', { memberIds: ['a', 'b', 'c'], scores: { a: 90, b: -60, c: -30 } }), trips: [] }], TODAY, OCT);
    expect(row?.ledgerSpread).toBe(2.5);
  });

  it('flags a crew that stopped riding as stalled and counts the period trips', () => {
    const [row] = crewRows([{ crew: crew('x'), trips: [trip('2026-09-30'), trip('2026-10-01'), trip('2026-10-20', { status: 'planned' })] }], TODAY, OCT);
    expect(row?.churn).toBe('stalled');
    expect(row?.tripsDone).toBe(1);
  });
});

describe('dashboardRanges', () => {
  it('merges the selected month with the churn window when they overlap or touch', () => {
    expect(dashboardRanges('2026-10', TODAY)).toEqual([{ from: '2026-09-25', to: '2026-10-31' }]);
    expect(dashboardRanges('2026-08', '2026-09-30')).toEqual([{ from: '2026-08-01', to: '2026-09-30' }]);
  });

  it('loads a distant month and the churn window separately, oldest first', () => {
    expect(dashboardRanges('2026-03', TODAY)).toEqual([
      { from: '2026-03-01', to: '2026-03-31' },
      { from: '2026-09-25', to: '2026-10-24' },
    ]);
  });
});

describe('tripsInRange', () => {
  it('keeps only the trips inside the period, per crew', () => {
    const crews: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-09-30'), trip('2026-10-01'), trip('2026-10-31'), trip('2026-11-01')] }];
    expect(tripsInRange(crews, OCT)[0]?.trips.map((t) => t.date)).toEqual(['2026-10-01', '2026-10-31']);
  });
});

describe('month helpers', () => {
  it('spans the whole month including leap days', () => {
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
  it('lists recent months across a year boundary', () => {
    expect(recentMonths('2026-02-10', 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });
  it('names a month the way the reader says it', () => {
    expect(monthLabel('2026-10', 'ko')).toBe('2026년 10월');
    expect(monthLabel('2026-10', 'en')).toBe('October 2026');
    expect(monthLabel('2025-12', 'en-US')).toBe('December 2025');
  });
  it('builds a file-system safe file name', () => {
    expect(csvFilename(' 대전 본사 / 1팀 ', '2026-10')).toBe('open-carpool-대전-본사-1팀-2026-10.csv');
    expect(csvFilename('  ', '2026-10')).toBe('open-carpool-group-2026-10.csv');
  });
});

describe('tripsCsv', () => {
  const members = [member('a'), member('b')];
  const crews: CrewTrips[] = [
    { crew: crew('Zeta'), trips: [trip('2026-10-02', { leg: 'back', id: '2026-10-02_back' }), trip('2026-10-02')] },
    { crew: crew('Alpha'), trips: [trip('2026-10-02', { absentIds: ['b'], riderIds: [] })] },
  ];

  it('starts with a BOM and the header row, then rows by date, leg and crew with names and localized words', () => {
    const lines = tripsCsv({ crews, members, moneyEnabled: false, labels: KO_LABELS }).split('\r\n');
    expect(lines[0]).toBe('\uFEFF날짜,구간,크루,운전자,탑승자,결석,상태,완료자,완료 시각');
    expect(lines.slice(1, 4)).toEqual([
      '2026-10-02,출발,Alpha,A,,B,완료,A,2026-10-02T09:00:00Z',
      '2026-10-02,출발,Zeta,A,B,,완료,A,2026-10-02T09:00:00Z',
      '2026-10-02,귀가,Zeta,A,B,,완료,A,2026-10-02T09:00:00Z',
    ]);
  });

  it('writes every status in the reader\'s words, never the stored enum', () => {
    const statuses: CrewTrips[] = [
      { crew: crew('x'), trips: [trip('2026-10-05', { status: 'needs_driver', driverId: null, completedBy: null, completedAt: null }), trip('2026-10-06', { status: 'planned' }), trip('2026-10-07', { status: 'cancelled' })] },
    ];
    const rows = tripsCsv({ crews: statuses, members, moneyEnabled: false, labels: KO_LABELS }).split('\r\n').slice(1, 4);
    expect(rows.map((r) => r.split(',')[6])).toEqual(['운전자 필요', '예정', '취소']);
    expect(rows.join('\n')).not.toMatch(/needs_driver|planned|cancelled|,out,/);
  });

  it('adds cost columns only when money features are enabled', () => {
    const paid: CrewTrips[] = [{ crew: crew('x'), trips: [trip('2026-10-02', { cost: { totalAmount: 12, currency: 'USD' } })] }];
    const lines = tripsCsv({ crews: paid, members, moneyEnabled: true, labels: KO_LABELS }).split('\r\n');
    expect(lines[0]?.endsWith(',비용,통화')).toBe(true);
    expect(lines[1]?.endsWith(',12,USD')).toBe(true);
  });
});
