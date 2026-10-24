# CNU 카풀 서비스 현재 상태 (2026-04-13)

## 동작하는 것
- 87개 유닛 테스트 전부 통과
- TypeScript 0 에러, Vite 빌드 성공 (416KB)
- localStorage 기반 로컬 DB (Firebase 제거됨)
- 테스트 유저 10명 + 활성 경로 4개 자동 시드
- 데모 유저 전환 (내 정보 탭)
- 카카오 우편번호 검색 (Daum Postcode)
- 캠퍼스 4개 권역 선택기
- 5부제 자동 검증 (차량 번호 기반)
- 네이버 Directions 5 API (경로 계산) ✅ 동작
- 네이버 Geocoding API ✅ 동작
- 네이버 Reverse Geocoding API ✅ 동작
- 매칭 필터링 (도보 반경 기반 경로 교차)
- 탑승 신청/수락/거절 플로우
- 실시간 GPS 추적 + 위치 공유 (localStorage)
- 지오펜싱 도착 자동 감지
- ErrorBoundary (화이트 스크린 방지)

## 미해결 문제: 네이버 Dynamic Map 인증 실패

### 증상
- 네이버 Maps JS SDK (Dynamic Map) 로드 시 "Authentication Failed" 에러
- 지도 타일이 로드되지 않아 빈 화면 표시
- SDK 내부에서 null.forEach, null.capitalize 크래시 발생

### 원인 분석
네이버 클라우드 플랫폼(NCP)의 API는 두 가지 인증 방식이 있음:

1. **REST API** (Directions, Geocoding, Reverse Geocoding)
   - Vite dev 프록시를 통해 서버사이드에서 호출
   - HTTP 헤더로 Client ID + Client Secret 전달
   - **도메인 검사 없음** → 정상 동작

2. **Dynamic Map JS SDK** (지도 표시)
   - 브라우저에서 직접 `<script>` 태그로 로드
   - URL 파라미터로 Client ID만 전달 (`ncpClientId=xxx`)
   - **NCP 서버가 HTTP Referer 헤더의 도메인을 등록된 Web URL과 대조**
   - `http://localhost:5173`이 등록되어 있지만 **NCP 서버 측 반영이 지연됨**

### 시도한 것
1. NCP 앱 삭제 후 재생성 (CNU → CNU2, 새 Client ID: cx1m406zu7)
2. Web 서비스 URL에 localhost:5173, 127.0.0.1:5173, localhost, 127.0.0.1 등록
3. useNaverMaps 훅에서 인증 실패 감지 시도:
   - window.addEventListener('error') — SDK 에러 일부만 캐치
   - console.log/warn 패치 — SDK가 다른 출력 경로 사용
   - 숨겨진 div에 Map 생성 테스트 — 글로벌 에러 핸들러 조합
4. MapComponent에 try-catch + ErrorBoundary 방어
5. mapReady 상태 분리로 오버레이 크래시 방지

### 현재 방어 상태
- SDK 인증 실패 시 글로벌 에러 핸들러가 크래시를 `preventDefault()` 
- MapComponent 오버레이 생성은 try-catch로 감싸져 있음
- ErrorBoundary가 최상위에 있어 앱 크래시 시 복구 가능
- **단, "🗺️ 지도 로딩 대기 중" 플레이스홀더가 정상 표시되지 않는 상태**
  - SDK가 isLoaded=true로 판정되어 빈 지도 div를 렌더링하기 때문

### 해결 방안
1. **NCP URL 반영 대기** — 새 앱 생성 후 최대 30분~1시간 소요 가능
2. **NCP에 문의** — Dynamic Map 인증이 localhost에서 안 되는지 확인
3. **다른 지도 SDK로 전환** — Kakao Maps JS SDK (무료, 인증 간단)
4. **지도 없이 데모** — 경로 계산/매칭은 API로 동작하므로, 지도는 정적 이미지로 대체 가능
