import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, User, Route, Ride, Coordinate } from '../types';
import { getCurrentEmployeeId } from '../lib/legacyAuth';
import { getUser, subscribeToActiveRoutes, getMyActiveRoute, getMyActiveRide, getRouteById, updateRouteStatus } from '../lib/firebaseDb';

interface AppContextType {
  state: AppState;
  setState: (state: AppState) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthReady: boolean;
  walkingRadius: number;
  setWalkingRadius: (radius: number) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;
  pickupPoint: Coordinate | null;
  setPickupPoint: (point: Coordinate | null) => void;
  availableRoutes: Route[];
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;
  currentRoute: Route | null;
  setCurrentRoute: (route: Route | null) => void;
  driverSource: string;
  setDriverSource: (source: string) => void;
  driverDest: string;
  setDriverDest: (dest: string) => void;
  driverRoute: Coordinate[];
  setDriverRoute: (route: Coordinate[]) => void;
  driverSourceCoord: Coordinate | null;
  setDriverSourceCoord: (coord: Coordinate | null) => void;
  driverDestCoord: Coordinate | null;
  setDriverDestCoord: (coord: Coordinate | null) => void;
  clearActiveCarpool: () => void;
  searchMode: 'commute' | 'return';
  setSearchMode: (mode: 'commute' | 'return') => void;
  searchDate: string;
  setSearchDate: (date: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [walkingRadius, setWalkingRadius] = useState(10);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [pickupPoint, setPickupPoint] = useState<Coordinate | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [driverSource, setDriverSource] = useState('');
  const [driverDest, setDriverDest] = useState('');
  const [driverRoute, setDriverRoute] = useState<Coordinate[]>([]);
  const [driverSourceCoord, setDriverSourceCoord] = useState<Coordinate | null>(null);
  const [driverDestCoord, setDriverDestCoord] = useState<Coordinate | null>(null);
  const [searchMode, setSearchMode] = useState<'commute' | 'return'>('commute');
  const [searchDate, setSearchDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Wrapper: HOME 이동 시 임시 UI 상태만 정리 (활성 카풀은 유지)
  const setState = (newState: AppState) => {
    if (newState === 'HOME') {
      setPickupPoint(null);
      setDriverSource('');
      setDriverDest('');
      setDriverRoute([]);
      setDriverSourceCoord(null);
      setDriverDestCoord(null);
      // currentRide, currentRoute, selectedRoute는 유지 — 홈 배너에서 사용
    }
    setStateRaw(newState);
  };

  // 활성 카풀 완전 종료 시 호출 (completed, cancelled 등)
  const clearActiveCarpool = () => {
    setCurrentRide(null);
    setCurrentRoute(null);
    setSelectedRoute(null);
  };

  // 세션 복구: 로그인 유지 + 활성 카풀 복원
  useEffect(() => {
    async function init() {
      const employeeId = getCurrentEmployeeId();
      if (employeeId) {
        const existingUser = await getUser(employeeId);
        if (existingUser) {
          setUser(existingUser);
          // 활성 카풀 복원
          const [activeRoute, activeRide] = await Promise.all([
            getMyActiveRoute(employeeId),
            getMyActiveRide(employeeId),
          ]);
          if (activeRoute) {
            // 24시간 지난 route는 자동 만료
            const routeAge = Date.now() - new Date(activeRoute.createdAt).getTime();
            if (routeAge > 24 * 60 * 60 * 1000) {
              if (activeRoute.id) {
                try { await updateRouteStatus(activeRoute.id, 'cancelled'); } catch {}
              }
            } else {
              setCurrentRoute(activeRoute);
            }
          }
          if (activeRide) {
            setCurrentRide(activeRide);
            // ride에 연결된 route도 복원
            if (activeRide.routeId) {
              const route = await getRouteById(activeRide.routeId);
              if (route) setSelectedRoute(route);
            }
          }
          setStateRaw('HOME');
        } else {
          setStateRaw('LOGIN');
        }
      } else {
        setStateRaw('LOGIN');
      }
      setIsAuthReady(true);
    }
    init();
  }, []);

  // 실시간 경로 구독
  useEffect(() => {
    const unsubscribe = subscribeToActiveRoutes(setAvailableRoutes);
    return unsubscribe;
  }, []);

  return (
    <AppContext.Provider value={{
      state, setState,
      user, setUser,
      isAuthReady,
      walkingRadius, setWalkingRadius,
      selectedRoute, setSelectedRoute,
      pickupPoint, setPickupPoint,
      availableRoutes,
      currentRide, setCurrentRide,
      currentRoute, setCurrentRoute,
      driverSource, setDriverSource,
      driverDest, setDriverDest,
      driverRoute, setDriverRoute,
      driverSourceCoord, setDriverSourceCoord,
      driverDestCoord, setDriverDestCoord,
      clearActiveCarpool,
      searchMode, setSearchMode,
      searchDate, setSearchDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}
