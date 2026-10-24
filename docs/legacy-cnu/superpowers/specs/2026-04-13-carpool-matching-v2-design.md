# CNU 카풀 매칭 v2 — 실배포용 설계

## 개요

CNU 교직원 카풀 서비스의 매칭 흐름을 실배포 수준으로 개선한다.
핵심 변경: 채팅 기반 합의 확정, 양방향 취소/알림, 운전자 신청자 선택, 카풀 이력 관리.

## 1. Ride 상태 흐름

```
pending → accepted → confirming → confirmed → completed
   ↓         ↓           ↓            ↓
rejected  cancelled   cancelled    cancelled
```

| 상태 | 의미 | 트리거 |
|------|------|--------|
| `pending` | 탑승자가 신청 | 탑승자 "탑승 신청" 클릭 |
| `accepted` | 운전자가 수락, 채팅 시작 | 운전자 "수락" 클릭 |
| `confirming` | 한쪽이 합의 완료 | 어느 한쪽 "합의 완료" 클릭 |
| `confirmed` | 양쪽 모두 확정 | 상대방도 "합의 완료" 클릭 |
| `completed` | 카풀 완료 | 어느 한쪽 "하차 완료" 클릭 |
| `rejected` | 운전자가 신청 거절 | 운전자 "거절" 클릭 (pending 단계에서만) |
| `cancelled` | 취소됨 | accepted 이후 어느 단계에서든 "취소" 가능 |

### 제약 조건

- **탑승자는 동시에 1개의 활성 ride만 가능** (pending/accepted/confirming/confirmed 상태). 새로 신청하려면 기존 건을 취소해야 함.
- **하차 완료는 어느 한쪽이든 누를 수 있음** — 한쪽이 누르면 바로 completed.

### AppState 매핑

기존 `DRIVER_EN_ROUTE`, `DRIVER_IN_TRANSIT`, `PASSENGER_EN_ROUTE`, `PASSENGER_IN_TRANSIT` 화면은 비활성화(주석처리). 새 흐름에서의 매핑:

| ride.status | 운전자 AppState | 탑승자 AppState |
|-------------|----------------|----------------|
| pending | DRIVER_ACTIVE | PASSENGER_MATCHED |
| accepted | DRIVER_MATCHED (채팅) | PASSENGER_MATCHED (채팅) |
| confirming | DRIVER_MATCHED (채팅) | PASSENGER_MATCHED (채팅) |
| confirmed | DRIVER_MATCHED (채팅) | PASSENGER_MATCHED (채팅) |
| completed | HOME | HOME |
| rejected/cancelled | HOME (모달 알림) | HOME (모달 알림) |

## 2. 타입 변경

### Ride 추가 필드

```typescript
interface Ride {
  // 기존 필드 유지
  id?: string;
  routeId: string;
  driverId: string;
  passengerId: string;
  passengerName: string;
  pickupCoord: Coordinate;
  pickupName?: string;
  status: 'pending' | 'accepted' | 'confirming' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: any;

  // 신규 필드
  driverName?: string;                  // 운전자 이름 (이력 조회용 비정규화)
  driverConfirmed?: boolean;            // 운전자 합의 확정 여부
  passengerConfirmed?: boolean;         // 탑승자 합의 확정 여부
  cancelledBy?: 'driver' | 'passenger'; // 누가 취소했는지
  passengerDepartureAddress?: string;   // 탑승자 출발지 주소명
  passengerDepartureCoord?: Coordinate; // 탑승자 출발지 좌표
  passengerDestBuilding?: string;       // 탑승자 목적지 건물명
  completedAt?: string;                 // 완료 시각 (ISO string)
}
```

### User 추가 필드

```typescript
interface User {
  // 기존 필드 유지
  // 신규: 카풀 통계
  stats?: {
    totalRides: number;
    driveCount: number;
    rideCount: number;
    cancelCount: number;
  };
}
```

## 3. 운전자 신청자 목록 (DriverActiveScreen)

- 운전자가 여러 신청자를 목록으로 봄
- 각 신청자 카드에 표시: 이름, 학과, 출발지 주소(약 Xkm), 목적지 건물명
- 출발지 거리는 Haversine 직선거리, "약" 접두어로 대략치 표현
- 정렬: 출발지 거리 가까운 순
- 수락: 잔여 좌석 수만큼 수락 가능. `route.availableSeats`를 수락 시 -1, 취소/거절 시 +1 (트랜잭션으로 atomic 처리)
- 거절: ride.status → `rejected`, 시스템 메시지 전송 (cancelled와 구분)

### 필요 데이터

탑승자가 신청할 때 ride에 `passengerDepartureAddress`(출발지 주소명)와 `passengerDestBuilding`(목적지 건물명)을 함께 저장한다. 거리는 운전자 화면에서 실시간 계산(Haversine).

## 4. 채팅 + 합의 확정 (ChatRoom)

### 시스템 메시지

채팅에 자동 삽입되는 시스템 메시지:

| 이벤트 | 메시지 |
|--------|--------|
| 운전자 수락 | "운전자가 탑승을 수락했습니다. 채팅으로 픽업 장소를 정해주세요!" |
| 한쪽 합의 완료 | "OOO님이 합의를 확정했습니다. 상대방의 확정을 기다립니다." |
| 양쪽 합의 완료 | "양쪽 모두 합의 완료! 매칭이 확정되었습니다." |
| 도착 알림 | "OOO님이 약속 장소에 도착했습니다!" |
| 매칭 취소 | "OOO님이 매칭을 취소했습니다." |

시스템 메시지 구분: `message.senderId === 'system'`

### 채팅 하단 액션 버튼

- **합의 완료**: `runTransaction`으로 race condition 방지 (아래 참조)
- **매칭 취소**: ride.status를 cancelled로 변경
- **도착했어요**: 시스템 메시지 전송 (confirmed 상태에서만)

### 합의 확정 트랜잭션 (race condition 방지)

`confirmedBy` 단일 필드 대신 `driverConfirmed` + `passengerConfirmed` 두 boolean 필드 사용.
Firestore `runTransaction`으로 atomic하게 처리:

```typescript
async function confirmRide(rideId: string, role: 'driver' | 'passenger') {
  await runTransaction(db, async (transaction) => {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await transaction.get(rideRef);
    const ride = rideSnap.data();

    if (role === 'driver') {
      transaction.update(rideRef, { driverConfirmed: true });
    } else {
      transaction.update(rideRef, { passengerConfirmed: true });
    }

    // 상대방이 이미 확정했으면 → confirmed
    const otherConfirmed = role === 'driver' ? ride.passengerConfirmed : ride.driverConfirmed;
    if (otherConfirmed) {
      transaction.update(rideRef, { status: 'confirmed' });
    } else {
      transaction.update(rideRef, { status: 'confirming' });
    }
  });
}
```

이렇게 하면 양쪽이 동시에 눌러도 트랜잭션이 직렬화해서 최종 상태가 정확히 `confirmed`가 됨.

버튼 상태는 ride.status에 따라 동적으로 변경:
- `accepted`: [매칭 취소] [합의 완료]
- `confirming` + 본인이 확정한 경우: [매칭 취소] (합의 완료 비활성)
- `confirming` + 상대가 확정한 경우: [매칭 취소] [합의 확정]
- `confirmed`: [매칭 취소] [도착했어요] [하차 완료]

## 5. 취소 흐름

어느 단계에서든 취소 가능. 취소 시:
1. `ride.status` → `'cancelled'`
2. `ride.cancelledBy` → 취소한 사람 역할
3. 채팅에 시스템 메시지 삽입
4. 상대방 화면이 실시간 구독으로 즉시 변경 감지
5. 취소한 사용자의 `stats.cancelCount` +1
6. 상대방 화면에 "매칭이 취소되었습니다" 모달 → HOME으로 이동

## 6. 도착 알림

GPS 자동감지 비활성화. 수동 방식:
1. `confirmed` 상태에서 "도착했어요" 버튼 노출
2. 클릭 시 채팅에 시스템 메시지 삽입: "OOO님이 약속 장소에 도착했습니다!"
3. 상대방이 채팅에서 실시간으로 확인

## 7. 카풀 이력 관리

### 완료 시 통계 업데이트 (writeBatch로 atomic 처리)

카풀 완료(`completed`) 시 3개 문서를 `writeBatch`로 한 번에 업데이트:

```typescript
async function completeRide(rideId: string, driverId: string, passengerId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'rides', rideId), {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
  batch.update(doc(db, 'users', driverId), {
    'stats.totalRides': increment(1),
    'stats.driveCount': increment(1),
  });
  batch.update(doc(db, 'users', passengerId), {
    'stats.totalRides': increment(1),
    'stats.rideCount': increment(1),
  });
  await batch.commit();
}
```

취소 시에도 동일하게 batch로 `cancelCount` +1 처리.

### 프로필 화면

- 통계 표시: 운전 N회, 탑승 N회, 총 N회, 취소 N회
- 최근 카풀 이력: rides 컬렉션에서 본인 관련 완료/취소 건 조회
- 각 이력: 날짜, 역할(운전/탑승), 상대방 이름, 상태

### Firestore 쿼리

```typescript
// 본인이 운전자인 rides
query(collection(db, 'rides'), where('driverId', '==', uid), orderBy('createdAt', 'desc'), limit(20))
// 본인이 탑승자인 rides
query(collection(db, 'rides'), where('passengerId', '==', uid), orderBy('createdAt', 'desc'), limit(20))
```

> **Firestore 인덱스 필요**: 위 쿼리는 복합 인덱스(driverId + createdAt, passengerId + createdAt)가 필요. `firestore.indexes.json`에 추가하거나 Firebase 콘솔에서 생성.

## 8. GPS 추적 비활성화

다음 화면의 GPS 추적 로직을 주석처리:
- DriverEnRouteScreen: useGeolocation, updateLocation, hasArrived
- DriverInTransitScreen: useGeolocation, updateLocation, hasArrived
- PassengerEnRouteScreen: subscribeToLocation
- PassengerInTransitScreen: (이미 GPS 없음)

지도(MapComponent)는 이미 주석처리 완료.

## 9. 프로덕션 품질 개선

- 역할 전환 시 context 데이터 정리 (HOME 진입 시 reset)
- Firebase 작업에 try-catch + 사용자 피드백
- useEffect 의존성 배열 수정
- 채팅 없이 CHAT 진입 시 fallback UI

## 10. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `types.ts` | Ride/User 타입 확장 |
| `firebaseDb.ts` | 확정/취소/통계/이력 함수 추가 |
| `chatService.ts` | 시스템 메시지 전송 함수 |
| `AppContext.tsx` | 상태 전환 시 데이터 정리 |
| `DriverActiveScreen.tsx` | 신청자 상세 카드 + 거리 + 건물명 |
| `DriverMatchedScreen.tsx` | 채팅 통합 + 합의/취소/도착 버튼 |
| `PassengerSearchScreen.tsx` | 신청 시 출발지/목적지 정보 포함 |
| `PassengerMatchedScreen.tsx` | 채팅 통합 + 합의/취소/도착 버튼 |
| `ChatRoom.tsx` | 시스템 메시지 표시 + 액션 버튼 props |
| `ProfileScreen.tsx` | 통계 + 이력 표시 |
| `DriverEnRouteScreen.tsx` | GPS 추적 주석처리 |
| `DriverInTransitScreen.tsx` | GPS 추적 주석처리 |
| `PassengerEnRouteScreen.tsx` | GPS 추적 주석처리 |
