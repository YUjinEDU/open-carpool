# open-carpool 시장·운영 리서치 요약 (2026-10)

조사일 2026-10-24. 리서치 팀원 8명과 별도 조사 작업 9개로 출처 253개(도메인 182개)를 수집했어요. 원본 기록은 `.omo/ulw-research/20261024-231643/`에 있어요(로컬 전용).

## 한 줄 결론
모르는 사람끼리 이어 주는 **매칭 앱은 국내외 모두 실패**했어요. **이미 아는 사람끼리 모인 단체의 고정 카풀 크루를 운영하고 기록하는 도구**에는 빈자리가 있어요. 다만 구성원이 정해진 단체라는 것만으로 수요가 생기지는 않아요. **외부 압박(주차난, 부제, 통근 불편)이 있는 단체**를 노려야 해요.

## 타깃 (반박 검토 반영)
| 우선순위 | 대상 | 이유 |
|---|---|---|
| 1 | 동호회, 학부모, 소규모 직장 크루(무료 셀프서비스, 단톡방 안에서 링크로 사용) | 진짜 문제는 간사의 관리 부담(명단, 순번, 기록)이에요. 단톡방을 대체하지 않아요[S56] |
| 1 | 공공기관, 국립대, 산업단지(부제 모드, 기관용 리포트) | 2026년 부제 때 수요가 생겼지만[S6][S7][S8], 앱 없이 단톡방과 통근버스로 흡수됐어요[S59]. 비용을 내는 쪽은 기관뿐이에요[S55] |
| 2 | 해외 영어 셀프서비스(미국 중심) | 실비 분담이 합법이고 영어만으로 진입할 수 있어요. 이미 경쟁 서비스가 많아서 수익 상한은 Pro IAP 정도예요[S61] |
| 관찰 | 일본, 스페인 | 일본은 회사 규정이 동승을 금지하는 경우가 많아요[S60]. 스페인은 컨설팅 중심의 규제 대응 시장이에요[S51] |
| 피하기 | 모르는 사람 대상 P2P 유상 매칭, UAE·베트남·브라질 | 법적 위험이 커요 |

## 핵심 근거
- **실패 사례**: 카카오 카풀 중단, 풀러스 폐업(2024-03)[S10], Waze Carpool 종료(2022)[S19], Scoop은 COVID 이후 이용이 98% 감소[S22].
- **생존 사례**: Karos·Daily는 2025년 운행의 86%가 파트너(기업·지자체) 기반이에요[S20][S21]. Liftshare는 고용주가 비용을 내는 구조예요[S25]. 보조금이 끊기면 이용이 11%에서 43%까지 줄었어요[S28].
- **한국 법**: 기름값을 나누는 것도 유상 운송이에요[S1][S2]. 예외는 평일 07-09시, 18-20시 출퇴근뿐이고, 앱의 중개도 처벌 대상이에요[S1][S3]. 회비에 비용을 넣는 방식도 유상이에요[S4]. 위치를 공유하는 기능은 신고 대상이에요[S5].
- **운영**: 고정 크루, 공정 순번(Fagin-Williams)[S13][S14], 전날 마감[S24], 인센티브는 주차 우대가 포인트보다 효과가 커요[S15][S12].
- **기술**: Google은 한국에서 운전 경로를 제공하지 않아요(2026-10 기준)[S35][S38]. 네이버 지도는 국내 전용이에요[S41]. Google 지도는 약관상 다른 지도와 섞어 쓸 수 없어요[S37]. 카카오톡 인앱 브라우저에서는 Google 로그인이 막혀요[S42].
- **출시 모델**: 오픈소스 카풀 중 사업이 되는 곳은 Mobicoop 하나예요. 서비스 판매로 수익을 내고 오픈코어로 전환했어요[S33]. 업체가 갑자기 서비스를 종료하는 위험이 있어서(TwoGo 2025)[S29], 오픈소스와 데이터 내보내기가 판매 포인트가 될 수 있어요.

## 남은 공백
- 네이버 신규 요금표와 지도 약관 원문
- 국내 상시 카풀 수요의 정량 데이터
- 일본어 기준 경쟁사 재확인
- 제81조 시간대 요건과 경로 요건이 함께 적용되는지 다룬 판례

자세한 운영 설계는 [operations-workflow.md](operations-workflow.md), 계획은 [../ROADMAP.md](../ROADMAP.md)를 참고하세요.

## 출처
- [S1] law.go.kr 여객자동차 운수사업법 제81조·제90조·제93조 (시행 2026.11.30.): https://www.law.go.kr/법령/여객자동차운수사업법
- [S2] 대법원 1997.7.11. 97도1463 (유류대=유상운송): https://www.law.go.kr
- [S3] 헌법재판소 2021.4.29. 2018헌바100: https://www.law.go.kr
- [S4] 국토교통부 자가용 유상운송 유권해석사례 (2018): https://www.molit.go.kr/USR/policyTarget/dtl.jsp?idx=1034
- [S5] 위치정보의 보호 및 이용 등에 관한 법률 제9조·제19조 (시행 2025.10.1.): https://www.law.go.kr
- [S6] 기후에너지환경부 공공기관 승용차 2부제 시행지침 (2026-04-07): https://www.mcee.go.kr
- [S7] 한국대학신문, 대학가 승용차 5부제 동참 확산 (2026-03-31): https://news.unn.net
- [S8] 뉴시스, 카풀도 집·마음 맞아야 (2026-04-08) / 차량부제 해제 첫날 (2026-07-01): https://www.newsis.com
- [S9] 뉴스1, 진천군 카풀하기 딱 좋은 날 (2026-04-24): https://www.news1.kr
- [S10] 한겨레/국민일보, 풀러스 무료 전환·폐업 (2020, 2025-02-20): https://www.hani.co.kr/arti/950294
- [S11] FHWA SBCAG Avego/Carma 시범사업 보고서: https://highways.dot.gov/media/109906
- [S12] USDOT FHWA-HOP-21-011 ch.3 (Hytch, Scoop 인센티브): https://ops.fhwa.dot.gov/publications/fhwahop21011/ch3.htm
- [S13] Fagin & Williams 1983, A Fair Carpool Scheduling Algorithm, IBM J R&D 27(2): https://bitsavers.org/pdf/ibm/IBM_Journal_of_Research_and_Development/272/ibmrd2702T.pdf
- [S14] Naor, On fairness in the carpool problem: https://www.wisdom.weizmann.ac.il/~naor/PAPERS/fair_carpool.pdf
- [S15] Shoup 1997, Evaluating the effects of cashing out employer-paid parking: http://shoup.bol.ucla.edu/EvaluatingCashOut.pdf
- [S16] Beroldo 1987, Duration of carpool and vanpool usage (RIDES): https://trid.trb.org/view/282571
- [S17] Chan & Shaheen 2012, Ridesharing in North America: https://doi.org/10.1080/01441647.2011.621557
- [S18] Neoh, Chipulu, Marshall 2017, What encourages people to carpool? (Transportation 44): https://ideas.repec.org/a/kap/transp/v44y2017i2d10.1007_s11116-015-9661-7.html
- [S19] Waze Carpool 종료 공지 (2022-08-25): https://www.waze.com/discuss/t/retiring-the-waze-carpool-service/330261
- [S20] Karos·Daily 인수 보도자료 (2026-10): https://www.citizencapital.fr/wp-content/uploads/2026/10/CP-KarosDaily.pdf
- [S21] BlaBlaCar Daily 소개 (2025 통계): https://www.blablacardaily.com/a-propos
- [S22] Inc., Scoop 85% 감원과 피벗 (2022-11): https://www.inc.com/ali-donaldson/this-startup-laid-off-85-of-its-team-and-pivoted-hard-to-survive.html
- [S23] Scoop 가격표: https://www.scoopcommute.com/pricing
- [S24] Scoop 고객센터 마감·취소 규칙: https://support.scoopcommute.com/hc/en-us/articles/215487888
- [S25] Mobilityways / Liftshare: https://mobilityways.com/about-us/
- [S26] Liftshare 버밍엄대 스마트 주차: https://blog.liftshare.com
- [S27] 프랑스 카풀 증빙 등록부 A/B/C 등급: https://doc.covoiturage.beta.gouv.fr
- [S28] France 3, 지역 보조금 중단 후 카풀 -43%: https://france3-regions.francetvinfo.fr
- [S29] Pendla, TwoGo 서비스 종료 (2025): https://www.pendla.com/news/twogo-wird-eingestellt-und-jetzt/
- [S30] GoKid 앱스토어: https://apps.apple.com/us/app/gokid-carpool-organizer/id1050331956
- [S31] TeamSnap 카풀 Assignments 도움말: https://helpme.teamsnap.com/article/672-coordinate-carpools-using-the-assignments-tab
- [S32] Spond, Fahrgemeinschaften organisieren (2026-10-16): https://www.spond.com/de/news-and-blog/fahrgemeinschaften-organisieren-spond
- [S33] Mobicoop 협동조합 소개: https://pro.mobicoop.fr/cooperative/
- [S34] Mobicoop 소스 (Covivo/mobicoop @c31ecff): https://github.com/Covivo/mobicoop/tree/c31ecff87acad7cbedb13aed71a9e41466b040cd
- [S35] Google Maps Platform 지역별 지원 범위: https://developers.google.com/maps/coverage
- [S36] Google Maps Platform 요금 (2025-03 이후): https://developers.google.com/maps/billing-and-pricing/pricing
- [S37] Google Maps Platform 서비스 약관 §3.2.3: https://cloud.google.com/maps-platform/terms
- [S38] Korea Herald, Google 한국 길안내 준비 (2026-08): https://www.koreaherald.com/article/10851560
- [S39] 정책브리핑, 구글 1:5000 지도 반출 조건부 허용 (2026-02-27): https://www.korea.kr/news/policyNewsView.do?newsId=148960112
- [S40] NAVER Cloud 지도 API 무료 제공량 종료 공지: https://www.ncloud.com/support/notice/all/1965
- [S41] 네이버 고객센터, 해외 지도 미제공: https://help.naver.com/service/5637/contents/18714
- [S42] Kakao DevTalk, 인앱브라우저 disallowed_useragent: https://devtalk.kakao.com/t/disallowed-useragent/30703
- [S43] Apple App Review Guidelines 4.8, 3.1.3(e): https://developer.apple.com/app-store/review/guidelines/
- [S44] WebKit, iOS 16.4 웹 푸시: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [S45] Capacitor Push Notifications: https://capacitorjs.com/docs/apis/push-notifications
- [S46] npm 다운로드 API (i18next, react-intl, lingui; 2026-10-16~22): https://api.npmjs.org/downloads
- [S47] IEA 2026 Energy Crisis Policy Response Tracker: https://www.iea.org
- [S48] Straits Times (AFP), BlaBlaCar 연료 위기 수요 (2026): https://www.straitstimes.com
- [S49] Code des transports L3132-1 (프랑스 카풀 정의): https://www.legifrance.gouv.fr
- [S50] 국토교통성(일본) 자가용 실비 수수 가이드라인: https://wwwtb.mlit.go.jp/hokkaido/content/000363515.pdf
- [S51] BOE Ley 9/2025 art.26 (스페인 직장 이동계획): https://www.boe.es
- [S52] CJEU C-434/15 Uber Spain: https://curia.europa.eu
- [S53] 카택스 (기업 유류비 정산): https://cartax.biz
- [S54] Kastle Back to Work Barometer: https://info.security.kastle.com
- [S55] GoKid Connect FAQ (학교가 비용 부담, 학부모 무료): https://gokid.mobi/connect-faq
- [S56] Carpool-Kids App Store: https://apps.apple.com/us/app/carpool-kids/id835273420
- [S57] Tsuchida & Wilshusen 1991, Santa Cruz Route 17 carpool study: https://escholarship.org/uc/item/7tb7h8m3
- [S58] WebKit bug 193946 (PWA 백그라운드 위치 미지원): https://bugs.webkit.org/show_bug.cgi?id=193946
- [S59] 연합뉴스, 2부제 첫날 통근버스·자발적 카풀 (2026-04-08): https://www.yna.co.kr/view/AKR20260408060500052
- [S60] TFM マイカー通勤規程 템플릿 (동승 금지 조항): https://tfmwork.com
- [S61] Pave Commute 블로그 (2024-10-28): https://pavecommute.app
