import { useState } from 'react';
import { School, Car, Home, Building2, Hash, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { User, SavedAddress, Vehicle } from '../types';
import { AddressSearch } from '../components/AddressSearch';
import { CampusBuildingSelector } from '../components/CampusBuildingSelector';
import { signup } from '../lib/legacyAuth';
import { useApp } from '../contexts/AppContext';
import { showToast } from '../components/Toast';

export function SignupScreen() {
  const { setUser, setState } = useApp();
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [dept, setDept] = useState('');
  const [role, setRole] = useState<'driver' | 'passenger' | 'both'>('both');
  const [homeAddr, setHomeAddr] = useState<SavedAddress>({ name: '', lat: 0, lng: 0 });
  const [workAddr, setWorkAddr] = useState<SavedAddress>({ name: '', lat: 0, lng: 0 });
  const [plateNumber, setPlateNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!name || !employeeId || !password || !dept) {
      setError('이름, 교번, 비밀번호, 소속을 모두 입력해주세요.');
      return;
    }
    if (!homeAddr.name) {
      showToast('집 주소를 입력해주세요.', 'info');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    const addresses: SavedAddress[] = [];
    if (homeAddr.name) addresses.push(homeAddr);
    if (workAddr.name) addresses.push(workAddr);

    const vehicle: Vehicle | undefined = plateNumber
      ? { plateNumber, model: carModel, color: carColor, seatCapacity: 4 }
      : undefined;

    // Firestore는 undefined 필드를 거부하므로 조건부 포함
    const userData: Record<string, any> = {
      name,
      employeeNumber: employeeId,
      department: dept,
      role,
      isVerified: true,
    };
    if (addresses.length > 0) userData.savedAddresses = addresses;
    if (vehicle) userData.vehicle = vehicle;

    try {
      const newUser = await signup(employeeId.trim(), password, userData as any);
      setUser(newUser);
      showToast(`${newUser.name}님, 가입을 환영합니다!`, 'success');
      setState('HOME');
    } catch (e: any) {
      setError(e.message || '가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-12 space-y-8 pb-32"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => setState('LOGIN')} className="p-2 rounded-full bg-surface-container-lowest shadow-sm">
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>
        <div>
          <School className="w-10 h-10 text-primary-container" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-primary-container tracking-tight">회원가입</h2>
          <p className="text-xs text-on-surface-variant">CNU 카풀 서비스 가입</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 이름 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">이름 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
            placeholder="예: 홍길동"
          />
        </div>

        {/* 교번 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">교번 * (로그인 ID)</label>
          <div className="relative flex items-center">
            <Hash className="absolute left-4 w-5 h-5 text-primary-container" />
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
              placeholder="예: 2024-12345"
              autoComplete="username"
            />
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">비밀번호 * (6자 이상)</label>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-5 h-5 text-primary-container" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
              placeholder="비밀번호 설정"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 text-on-surface-variant">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 소속 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">소속 부서/학과 *</label>
          <input
            type="text"
            value={dept}
            onChange={e => setDept(e.target.value)}
            className="w-full px-4 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
            placeholder="예: 공과대학 컴퓨터공학과"
          />
        </div>

        {/* 역할 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">주 이용 목적</label>
          <div className="grid grid-cols-3 gap-2">
            {(['passenger', 'driver', 'both'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-3 rounded-xl font-bold text-sm transition-colors ${
                  role === r
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container-lowest text-on-surface-variant'
                }`}
              >
                {r === 'passenger' ? '탑승' : r === 'driver' ? '운전' : '둘 다'}
              </button>
            ))}
          </div>
        </div>

        {/* 차량 정보 */}
        {(role === 'driver' || role === 'both') && (
          <div className="space-y-4 bg-blue-50/50 p-5 rounded-xl">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary-container" />
              <label className="text-xs font-bold text-primary-container uppercase tracking-widest">차량 정보</label>
            </div>
            <input
              type="text"
              value={plateNumber}
              onChange={e => setPlateNumber(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
              placeholder="차량 번호 (예: 대전 12가 3456)"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={carModel}
                onChange={e => setCarModel(e.target.value)}
                className="px-4 py-3 bg-white rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                placeholder="차종 (예: 그랜저)"
              />
              <input
                type="text"
                value={carColor}
                onChange={e => setCarColor(e.target.value)}
                className="px-4 py-3 bg-white rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                placeholder="색상 (예: 화이트)"
              />
            </div>
          </div>
        )}

        {/* 주소 */}
        <div className="space-y-5">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">주소 등록 (필수)</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2 ml-1">
              <Home className="w-4 h-4 text-primary-container" />
              <span className="text-sm font-bold text-on-surface">집</span>
            </div>
            <AddressSearch
              value={homeAddr.name}
              onAddressSelected={result => setHomeAddr({ name: result.name, lat: result.lat, lng: result.lng })}
              placeholder="집 주소를 검색해주세요"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 ml-1">
              <Building2 className="w-4 h-4 text-primary-container" />
              <span className="text-sm font-bold text-on-surface">직장 (캠퍼스 건물)</span>
            </div>
            <CampusBuildingSelector
              value={workAddr.name}
              onBuildingSelected={building => setWorkAddr({ name: building.name, lat: building.lat, lng: building.lng })}
              placeholder="캠퍼스 권역을 선택해주세요"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center">{error}</p>
        )}
      </div>

      <button
        onClick={handleSignup}
        disabled={!name || !employeeId || !password || !dept || isSubmitting}
        className={`w-full py-5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${
          name && employeeId && password && dept && !isSubmitting
            ? 'bg-primary-container text-white active:scale-95'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? '가입 중...' : '가입하고 시작하기'}
      </button>
    </motion.div>
  );
}
