/** Sample data for the gallery only. Names and numbers are invented. */
export const group = { name: '다온테크 판교 출근 카풀', members: 23, crews: 5 };

export const crew = {
  name: '분당 7시 40분 크루',
  pickup: '정자역 3번 출구 앞',
  outTime: '07:40',
  days: ['1', '2', '3', '4', '5'],
};

export const me = { uid: 'u2', name: '김도윤' };

export const members = [
  { uid: 'u1', name: '박서연', role: 'captain' as const, canDrive: true, balance: 1.5, detail: '이번 달 6회 운전' },
  { uid: 'u2', name: '김도윤', role: 'member' as const, canDrive: true, balance: 0.5, detail: '이번 달 4회 운전' },
  { uid: 'u3', name: '이하은', role: 'backup' as const, canDrive: true, balance: -0.5, detail: '이번 달 3회 운전' },
  { uid: 'u4', name: '최민재', role: 'member' as const, canDrive: false, balance: -1.5, detail: '운전하지 않아요' },
];

export const tomorrow = {
  dateLabel: '10월 27일 (화)',
  time: '07:40',
  driver: members[0],
  riders: [members[1], members[2], members[3]],
  cutoffLabel: '오늘 21:00 마감',
  remaining: '2시간 14분',
};

export const week = [
  { day: '월', date: '26', status: 'done' as const, text: '김도윤 운전' },
  { day: '화', date: '27', status: 'planned' as const, text: '박서연 운전' },
  { day: '수', date: '28', status: 'needs_driver' as const, text: '운전자 필요' },
  { day: '목', date: '29', status: 'planned' as const, text: '이하은 운전' },
  { day: '금', date: '30', status: 'absent' as const, text: '내가 빠지는 날' },
];

export const weekdays = [
  { value: '1', label: '월' },
  { value: '2', label: '화' },
  { value: '3', label: '수' },
  { value: '4', label: '목' },
  { value: '5', label: '금' },
  { value: '6', label: '토' },
  { value: '7', label: '일' },
];

export function formatBalance(value: number): string {
  if (value === 0) return '0회';
  const abs = Math.abs(value).toFixed(1).replace(/\.0$/, '');
  return value > 0 ? `+${abs}회 더 운전` : `-${abs}회`;
}
