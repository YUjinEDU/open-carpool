import { useState, useEffect } from 'react';
import { School, Hash, Lock, Eye, EyeOff, X, Car } from 'lucide-react';
import { motion } from 'motion/react';
import { login, resetPassword } from '../lib/legacyAuth';
import { useApp } from '../contexts/AppContext';
import { getActiveRoutes } from '../lib/firebaseDb';

export function LoginScreen() {
  const { setUser, setState } = useApp();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    getActiveRoutes().then(r => setActiveCount(r.length));
  }, []);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetId, setResetId] = useState('');
  const [resetName, setResetName] = useState('');
  const [resetDept, setResetDept] = useState('');
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      setError('교번과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const user = await login(employeeId.trim(), password);
      setUser(user);
      setState('HOME');
    } catch (e: any) {
      setError(e.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col justify-center px-6 py-12 space-y-8 bg-surface"
    >
      <div className="text-center space-y-3">
        <School className="w-20 h-20 text-primary-container mx-auto" />
        <h1 className="text-4xl font-black text-primary-container tracking-tight">CNU 카풀</h1>
        <p className="text-on-surface-variant font-medium">충남대학교 카풀 서비스</p>
        {activeCount > 0 && (
          <div className="flex justify-center pt-2">
            <span className="bg-blue-50 text-primary-container px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              모집 중 {activeCount}건
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">교번</label>
          <div className="relative flex items-center">
            <Hash className="absolute left-4 w-5 h-5 text-primary-container" />
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
              placeholder="예: 2024-12345"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">비밀번호</label>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-5 h-5 text-primary-container" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
              placeholder="비밀번호"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 text-on-surface-variant"
            >
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center">{error}</p>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleLogin}
          disabled={isLoading || !employeeId || !password}
          className={`w-full py-5 rounded-xl font-bold text-lg shadow-lg transition-all ${
            !isLoading && employeeId && password
              ? 'bg-primary-container text-white active:scale-95'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>

        <button
          onClick={() => setState('SIGNUP')}
          className="w-full py-4 rounded-xl font-bold text-primary-container bg-primary-container/10 active:scale-95 transition-all"
        >
          처음 사용하시나요? 회원가입
        </button>

        <button
          onClick={() => { setShowReset(true); setResetMsg(''); setResetId(''); setResetName(''); setResetDept(''); setResetPw(''); }}
          className="w-full text-center text-sm text-on-surface-variant font-medium py-2"
        >
          비밀번호를 잊으셨나요?
        </button>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showReset && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-6" onClick={() => setShowReset(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-primary-container">비밀번호 재설정</h3>
              <button onClick={() => setShowReset(false)} className="p-1.5 rounded-full bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant ml-1">교번</label>
                <input type="text" value={resetId} onChange={e => setResetId(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                  placeholder="가입한 교번" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant ml-1">이름 (본인 확인)</label>
                <input type="text" value={resetName} onChange={e => setResetName(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                  placeholder="가입 시 입력한 이름" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant ml-1">소속 (본인 확인)</label>
                <input type="text" value={resetDept} onChange={e => setResetDept(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                  placeholder="가입 시 입력한 소속" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant ml-1">새 비밀번호 (6자 이상)</label>
                <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-surface-container-lowest rounded-xl text-on-surface font-semibold shadow-sm focus:ring-2 focus:ring-primary-container outline-none"
                  placeholder="새 비밀번호" />
              </div>
              {resetMsg && (
                <p className={`text-sm font-medium text-center ${resetMsg.includes('완료') ? 'text-green-600' : 'text-red-500'}`}>
                  {resetMsg}
                </p>
              )}
            </div>
            <button
              onClick={async () => {
                if (!resetId || !resetName || !resetDept || !resetPw) { setResetMsg('모든 항목을 입력해주세요.'); return; }
                setResetLoading(true);
                try {
                  await resetPassword(resetId.trim(), resetName.trim(), resetDept.trim(), resetPw);
                  setResetMsg('비밀번호 재설정 완료! 새 비밀번호로 로그인하세요.');
                  setTimeout(() => setShowReset(false), 2000);
                } catch (e: any) {
                  setResetMsg(e.message || '재설정에 실패했습니다.');
                } finally {
                  setResetLoading(false);
                }
              }}
              disabled={resetLoading || !resetId || !resetPw}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                !resetLoading && resetId && resetPw
                  ? 'bg-primary-container text-white active:scale-95'
                  : 'bg-slate-300 text-slate-500'
              }`}
            >
              {resetLoading ? '처리 중...' : '비밀번호 재설정'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
