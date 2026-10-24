import React, { useState, useEffect } from 'react';
import { MapPin, Car, Settings, LogOut, ChevronRight, BarChart3, History, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { logout } from '../lib/legacyAuth';
import { Ride } from '../types';
import { getRideHistory } from '../lib/firebaseDb';
import { ChatHistoryModal } from '../components/ChatHistoryModal';

export function ProfileScreen() {
  const { user, setUser, setState } = useApp();
  const [history, setHistory] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getRideHistory(user.uid).then(setHistory);
  }, [user?.uid]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setState('LOGIN');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 space-y-6 pb-32"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-primary-container tracking-tight">내 정보</h2>
        <button
          onClick={() => setState('PROFILE_EDIT')}
          className="text-primary-container font-bold text-sm bg-blue-50 px-4 py-2 rounded-full"
        >
          프로필 수정
        </button>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary-container/10 flex items-center justify-center border-4 border-primary-container/10">
          <span className="text-3xl font-black text-primary-container">{user?.name?.[0] ?? '?'}</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-primary-container">{user?.name}</h3>
          <p className="text-on-surface-variant font-medium">{user?.department}</p>
          {user?.employeeNumber && (
            <p className="text-xs text-on-surface-variant mt-1">교번 {user.employeeNumber}</p>
          )}
        </div>
      </div>

      {/* 카풀 통계 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          카풀 통계
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-container-lowest rounded-xl p-3 text-center shadow-sm">
            <p className="text-xl font-black text-primary-container">{user?.stats?.totalRides ?? 0}</p>
            <p className="text-[10px] text-on-surface-variant font-bold">총 카풀</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 text-center shadow-sm">
            <p className="text-xl font-black text-blue-600">{user?.stats?.driveCount ?? 0}</p>
            <p className="text-[10px] text-on-surface-variant font-bold">운전</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 text-center shadow-sm">
            <p className="text-xl font-black text-green-600">{user?.stats?.rideCount ?? 0}</p>
            <p className="text-[10px] text-on-surface-variant font-bold">탑승</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 text-center shadow-sm">
            <p className="text-xl font-black text-red-500">{user?.stats?.cancelCount ?? 0}</p>
            <p className="text-[10px] text-on-surface-variant font-bold">취소</p>
          </div>
        </div>
      </div>

      {/* 카풀 이력 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-2">
          <History className="w-4 h-4" />
          최근 카풀 이력
        </h4>
        {history.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm text-center">
            <p className="text-on-surface-variant text-sm">카풀 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm divide-y divide-slate-100">
            {history.slice(0, 10).map((ride) => {
              const isDriver = ride.driverId === user?.uid;
              const otherName = isDriver ? ride.passengerName : (ride.driverName || '운전자');
              const date = new Date(ride.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
              const statusLabel = ride.status === 'completed' ? '완료' : ride.status === 'cancelled' ? '취소' : ride.status;
              const statusColor = ride.status === 'completed' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50';
              return (
                <div key={ride.id} className="px-5 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${isDriver ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {isDriver ? '운전' : '탑승'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{otherName}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {date}
                        {ride.passengerDepartureAddress && ` · ${ride.passengerDepartureAddress}`}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedRide(ride)}
                    className="flex items-center gap-1.5 text-[11px] text-primary-container font-bold ml-9"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    채팅 기록 보기
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 자주 가는 주소 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">자주 가는 주소</h4>
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-4">
          {user?.savedAddresses?.map((addr, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-4">
                <div className="bg-primary-container/10 p-3 rounded-full">
                  <MapPin className="w-5 h-5 text-primary-container" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">주소 {idx + 1}</p>
                  <p className="font-bold text-on-surface">{typeof addr === 'string' ? addr : addr.name}</p>
                </div>
              </div>
              {idx < (user.savedAddresses?.length || 0) - 1 && (
                <div className="w-full h-px bg-slate-100"></div>
              )}
            </React.Fragment>
          ))}
          {(!user?.savedAddresses || user.savedAddresses.length === 0) && (
            <p className="text-on-surface-variant text-sm text-center py-4">등록된 주소가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 차량 정보 */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">차량 정보</h4>
        {user?.vehicle ? (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="bg-primary-container/10 p-3 rounded-full">
              <Car className="w-6 h-6 text-primary-container" />
            </div>
            <div>
              <p className="font-bold text-on-surface">{user.vehicle.plateNumber}</p>
              <p className="text-xs text-on-surface-variant">
                {user.vehicle.model} ({user.vehicle.color}) · {user.vehicle.seatCapacity}인승
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm text-center">
            <p className="text-on-surface-variant text-sm">등록된 차량이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="space-y-2 pt-4">
        <button
          onClick={() => setState('PROFILE_EDIT')}
          className="w-full bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between text-on-surface font-bold shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-on-surface-variant" />
            프로필 설정
          </div>
          <ChevronRight className="w-5 h-5 text-outline" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full bg-red-50 p-4 rounded-xl flex items-center justify-between text-red-600 font-bold shadow-sm border border-red-100"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            로그아웃
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 채팅 기록 모달 */}
      {selectedRide?.id && (
        <ChatHistoryModal
          rideId={selectedRide.id}
          title={`${selectedRide.driverId === user?.uid ? selectedRide.passengerName : (selectedRide.driverName || '운전자')} 님과의 대화`}
          onClose={() => setSelectedRide(null)}
        />
      )}
    </motion.div>
  );
}
