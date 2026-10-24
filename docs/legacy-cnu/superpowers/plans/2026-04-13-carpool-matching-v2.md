# CNU 카풀 매칭 v2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 기반 합의 확정, 양방향 취소/알림, 운전자 신청자 선택, 카풀 이력 관리를 실배포 수준으로 구현

**Architecture:** Firebase Firestore 실시간 구독 기반. 합의 확정은 runTransaction으로 race condition 방지, 통계 업데이트는 writeBatch로 atomic 처리. 시스템 메시지는 chatService를 통해 senderId='system'으로 구분.

**Tech Stack:** React 18, TypeScript, Firebase Firestore, Vite, motion/react, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-13-carpool-matching-v2-design.md`

---

## Task 1: 타입 확장 (types.ts)

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Ride 타입에 신규 상태와 필드 추가**

Ride status에 `'confirming' | 'confirmed' | 'rejected'` 추가 (기존 `'pickup_negotiation' | 'en_route' | 'in_transit'`는 유지하되 사용하지 않음 — 기존 Firestore 데이터 호환). 신규 필드: `driverName`, `driverConfirmed`, `passengerConfirmed`, `cancelledBy`, `passengerDepartureAddress`, `passengerDepartureCoord`, `passengerDestBuilding`, `completedAt`.

- [ ] **Step 2: UserStats 인터페이스 + User에 stats 필드 추가**

```typescript
export interface UserStats {
  totalRides: number;
  driveCount: number;
  rideCount: number;
  cancelCount: number;
}
```
User에 `stats?: UserStats` 추가.

- [ ] **Step 3: 빌드 확인 + 커밋**

Run: `npx tsc --noEmit`

---

## Task 2: Firebase DB 함수 추가 (firebaseDb.ts)

**Files:**
- Modify: `src/lib/firebaseDb.ts`

- [ ] **Step 1: Firestore 임포트 확장**

`runTransaction`, `writeBatch`, `increment`, `orderBy`, `limit` 추가.

- [ ] **Step 2: confirmRide 트랜잭션 함수 (반환값: 'confirming' | 'confirmed')**

`driverConfirmed`/`passengerConfirmed` 두 boolean으로 관리. 양쪽 다 true이면 `status: 'confirmed'`, 한쪽만이면 `status: 'confirming'`. `runTransaction`으로 race condition 방지. **반환값으로 최종 상태를 돌려줘서 호출자가 정확한 시스템 메시지를 보낼 수 있게 한다** (로컬 state는 아직 갱신 안 됐으므로).

- [ ] **Step 3: completeRide batch 함수**

`writeBatch`로 ride 완료 + 운전자/탑승자 stats 동시 업데이트. `increment(1)` 사용.

- [ ] **Step 4: cancelRide batch 함수**

ride status → cancelled, cancelledBy 설정, 취소자 stats.cancelCount +1. `writeBatch`로 atomic.

- [ ] **Step 5: rejectRide 함수**

단순 `updateDoc` — status를 `'rejected'`로.

- [ ] **Step 6: acceptRide 트랜잭션 (좌석 -1)**

route.availableSeats가 0이면 에러 throw. ride status → accepted, route.availableSeats -1. `runTransaction`으로 atomic.

- [ ] **Step 7: getRideHistory 함수**

driverId/passengerId로 각각 쿼리 후 합치고 중복 제거, 날짜 역순 정렬. `limit(20)`.

- [ ] **Step 8: hasActiveRide 함수 (탑승자 1건 제한)**

`where('status', 'in', ['pending', 'accepted', 'confirming', 'confirmed'])` 단일 쿼리로 확인 (4번 쿼리 대신 1번).

- [ ] **Step 9: 빌드 확인 + 커밋**

---

## Task 3: 시스템 메시지 함수 (chatService.ts)

**Files:**
- Modify: `src/lib/chatService.ts`

- [ ] **Step 1: sendSystemMessage 함수 추가**

`senderId: 'system'`, `senderName: '시스템'`으로 채팅 메시지 삽입.

- [ ] **Step 2: 커밋**

---

## Task 4: AppContext 데이터 정리 (AppContext.tsx)

**Files:**
- Modify: `src/contexts/AppContext.tsx`

- [ ] **Step 1: setState를 래핑하여 HOME 진입 시 자동 정리**

`setAppState` 함수에서 `newState === 'HOME'`이면 `selectedRoute`, `currentRide`, `currentRoute`, `pickupPoint`, `driverSource`, `driverDest`, `driverRoute`, `driverSourceCoord`, `driverDestCoord`를 null/빈값으로 초기화.

- [ ] **Step 2: 빌드 확인 + 커밋**

---

## Task 5: 탑승자 검색 — 신청 시 상세정보 포함 (PassengerSearchScreen.tsx)

**Files:**
- Modify: `src/screens/passenger/PassengerSearchScreen.tsx`

- [ ] **Step 1: createRide 호출 시 상세정보 추가**

`driverName`, `passengerDepartureAddress` (user.savedAddresses[0].name), `passengerDepartureCoord` (pickupPoint), `passengerDestBuilding` (user.savedAddresses[1].name) 포함.

- [ ] **Step 2: hasActiveRide 체크 추가**

신청 전에 기존 활성 ride 유무 확인. 있으면 alert으로 안내.

- [ ] **Step 3: try-catch 에러 핸들링 추가**

- [ ] **Step 4: 빌드 확인 + 커밋**

---

## Task 6: 운전자 신청자 목록 개선 (DriverActiveScreen.tsx)

**Files:**
- Modify: `src/screens/driver/DriverActiveScreen.tsx`

- [ ] **Step 1: 신청자 카드에 상세정보 표시**

출발지 주소, 약 X.Xkm (Haversine으로 driverSourceCoord ↔ passengerDepartureCoord), 목적지 건물명.

- [ ] **Step 2: acceptRide 트랜잭션 + sendSystemMessage 호출**

수락 시 좌석 -1 트랜잭션 + "운전자가 탑승을 수락했습니다" 시스템 메시지.

- [ ] **Step 3: rejectRide + sendSystemMessage 호출**

거절 시 rejected 상태 + "운전자가 탑승 신청을 거절했습니다" 시스템 메시지.

- [ ] **Step 4: 신청자 목록 거리순 정렬 (useMemo)**

- [ ] **Step 5: 운행 취소 버튼 추가**

- [ ] **Step 6: 빌드 확인 + 커밋**

---

## Task 7: ChatRoom 개선 — 시스템 메시지 + 액션 버튼 (ChatRoom.tsx)

**Files:**
- Modify: `src/components/ChatRoom.tsx`

- [ ] **Step 1: 시스템 메시지 렌더링**

`msg.senderId === 'system'`이면 중앙 정렬 알림 스타일 (bg-slate-100, rounded-full).

- [ ] **Step 2: 실시간 ride 구독 (subscribeToRide)**

liveRide 상태로 버튼 상태 결정. cancelled/rejected 감지 시 alert + HOME 이동.

- [ ] **Step 3: 액션 버튼 영역 (입력창 위)**

ride.status에 따라 동적 버튼:
- accepted: [매칭 취소] [합의 완료]
- confirming + 본인 확정: [매칭 취소] + "상대방 확정 대기 중"
- confirming + 상대 확정: [매칭 취소] [합의 확정]
- confirmed: [매칭 취소] [도착했어요] [하차 완료]

- [ ] **Step 4: handleConfirm — confirmRide 반환값으로 시스템 메시지 결정**

`confirmRide`가 `'confirming'`을 반환하면 "OOO님이 합의를 확정했습니다" 메시지, `'confirmed'`를 반환하면 "양쪽 모두 합의 완료!" 메시지. 로컬 state가 아닌 트랜잭션 반환값을 신뢰해야 race condition 방지됨.

- [ ] **Step 5: handleCancel — confirm() → cancelRide + sendSystemMessage → HOME**

- [ ] **Step 6: handleArrived — sendSystemMessage "도착했습니다!"**

- [ ] **Step 7: handleComplete — confirm() → completeRide + sendSystemMessage → HOME**

- [ ] **Step 8: 빌드 확인 + 커밋**

---

## Task 8: DriverMatchedScreen 개선

**Files:**
- Modify: `src/screens/driver/DriverMatchedScreen.tsx`

- [ ] **Step 1: 실시간 ride 구독 + 상태 변화 감지**

cancelled/completed 시 HOME 이동.

- [ ] **Step 2: "픽업 장소로 이동하기" 버튼 제거**

DRIVER_EN_ROUTE 버튼 삭제, 채팅 버튼만 유지.

- [ ] **Step 3: 빌드 확인 + 커밋**

---

## Task 9: PassengerMatchedScreen 개선

**Files:**
- Modify: `src/screens/passenger/PassengerMatchedScreen.tsx`

- [ ] **Step 1: 모든 상태 대응 UI**

pending → 대기 + 신청취소 버튼, accepted~confirmed → 채팅 버튼, rejected → alert + HOME, cancelled → alert + HOME.

- [ ] **Step 2: pending 상태 신청 취소 (updateRideStatus → cancelled)**

- [ ] **Step 3: 빌드 확인 + 커밋**

---

## Task 10: GPS 추적 비활성화

**Files:**
- Modify: `src/screens/driver/DriverEnRouteScreen.tsx`
- Modify: `src/screens/driver/DriverInTransitScreen.tsx`
- Modify: `src/screens/passenger/PassengerEnRouteScreen.tsx`

- [ ] **Step 1: DriverEnRouteScreen GPS 로직 주석처리**

useGeolocation, updateLocation, hasArrived 관련 useEffect 전부 주석처리.

- [ ] **Step 2: DriverInTransitScreen GPS 로직 주석처리**

- [ ] **Step 3: PassengerEnRouteScreen GPS 구독 주석처리**

- [ ] **Step 4: 빌드 확인 + 커밋**

---

## Task 11: 프로필 — 통계 + 이력 (ProfileScreen.tsx)

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

- [ ] **Step 1: 통계 섹션 추가 (grid 4열)**

총 카풀, 운전, 탑승, 취소 각각 숫자 + 라벨. `user?.stats?.totalRides ?? 0` 패턴.

- [ ] **Step 2: 카풀 이력 섹션**

`getRideHistory(user.uid)` 호출, 각 항목에 날짜/역할(운전 or 탑승)/상대방 이름/상태 뱃지 표시.

- [ ] **Step 3: 빌드 확인 + 커밋**

---

## Task 12: 최종 통합 + 빌드 검증

- [ ] **Step 1: 전체 타입 체크** — `npx tsc --noEmit` 에러 0건
- [ ] **Step 2: 개발 서버 확인** — `npm run dev` 정상 기동
- [ ] **Step 3: 최종 커밋**
