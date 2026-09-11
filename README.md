# 인센티브 호텔 추천·견적 시스템 v22

## 이번 버전 핵심
1. 호텔 회신 메일 본문 붙여넣기 → OpenAI가 객실료/세금/조식/FOC/옵션/취소·결제조건 등을 구조화
2. AI 추출 결과를 기존 견적 입력폼에 자동 채움
3. 담당자가 확인·수정 후 저장
4. Supabase 중앙 DB에 견적 누적
5. 여러 사용자가 같은 견적 데이터를 공유하며 약 5초 간격으로 자동 동기화
6. 수정/삭제 시 `quote_history`에 스냅샷 이력이 남음
7. 호텔 회신 원문은 DB에 저장하지 않음

## 1. Supabase
새 프로젝트 생성 후 SQL Editor에서 `SUPABASE_SETUP.sql` 전체 실행.

그 다음 Table Editor > users에 허용 사번을 입력합니다.
- employee_id: H1234 형태
- name
- department
- active: true

## 2. Netlify 환경변수
Site configuration > Environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- OPENAI_MODEL (선택, 기본값 gpt-5.6-luna)

중요: SUPABASE_SERVICE_ROLE_KEY와 OPENAI_API_KEY는 절대 index.html에 넣지 마세요.

## 3. GitHub/Netlify 배포
이 폴더 전체를 GitHub 저장소 루트에 업로드:
- public/
- netlify/
- netlify.toml
- SUPABASE_SETUP.sql

Netlify에서 해당 GitHub 저장소 연결 후 배포.

## 4. 사용 흐름
로그인 → 호텔 추천 → 견적 비교 → 호텔 회신 본문 붙여넣기 → AI 분석 → 자동 입력된 항목 확인/수정 → 견적 저장 → 중앙 DB 누적.

다른 사용자는 같은 사이트에서 로그인하면 약 5초 이내 동일 견적이 화면에 반영됩니다.

## 보안/운영 메모
- 현재 인증은 `users` 화이트리스트의 사번 존재 여부를 확인하는 수준입니다. 사번 자체가 비밀번호는 아니므로 실제 전사 운영 전에는 Microsoft Entra ID/사내 SSO로 전환 권장.
- 브라우저에는 Supabase service-role key와 OpenAI API key가 노출되지 않습니다.
- OpenAI Responses API 요청은 `store:false`로 설정했습니다.
- 견적 데이터는 회사의 보안정책 검토 후 실제 데이터를 넣는 것을 권장합니다.
- 완전한 push 방식의 실시간 동기화가 필요하면 이후 Supabase Auth + Realtime로 확장할 수 있습니다.


## v22 Discovery 추가
- 기존 `HOTELS` 등록 데이터만 추천하지 않고, 선택 도시 주변 OpenStreetMap/Overpass 호텔을 실시간 탐색합니다.
- 내부 DB와 이름이 매칭되면 내부 객실수/연회장/요금 정보를 우선 활용합니다.
- 내부 DB에 없는 호텔도 `신규 발견 · 검증 필요` 후보로 표시합니다.
- 신규 호텔의 공식정보 검증은 사용자가 필요한 후보에만 실행합니다.
- 공식정보 검증은 OpenAI Responses API의 Web Search를 서버에서 호출합니다.
- 검증 결과는 Supabase `hotel_verifications`에 30일 캐시되어 같은 호텔을 반복 검색하지 않습니다.
- 이 설계는 검색 첫 화면을 빠르게 보여주고, 비용·지연이 큰 웹 검증을 필요한 호텔에만 사용하기 위한 구조입니다.

### 추가 배포 작업
기존 Supabase 프로젝트에서 수정된 `SUPABASE_SETUP.sql` 중 `hotel_verifications` 생성 구문을 실행하세요.
Netlify 환경변수는 기존 `OPENAI_API_KEY`를 그대로 사용합니다.
선택적으로 `OPENAI_WEB_MODEL`을 추가할 수 있습니다.


## V23: Supabase Hotel Master
V23부터 브라우저 코드 안의 정적 `HOTELS` 배열을 사용하지 않습니다.

로그인 후:
1. `/.netlify/functions/hotels`
2. Netlify Function이 Supabase `public.hotels` 조회
3. 화면에서 Supabase Master + OSM 신규 외부호텔을 병합
4. 조건 점수 계산 및 추천

따라서 Supabase `hotels` 테이블을 수정하면 다음 접속/새로고침 후 프로그램의 내부 Master에도 반영됩니다.

### 키워드(tags) 운영 원칙
- 기존 V21에서 사람이 입력한 `tags`는 그대로 추천 로직에 사용합니다.
- 신규 외부호텔은 임의 태그를 자동 적용하지 않습니다.
- 향후 공식정보 검증 후 AI가 태그 후보를 `suggested_tags`에 제안할 수 있습니다.
- 실제 추천점수에 쓰는 `tags`로 반영하는 것은 담당자 승인 후에만 합니다.
- `tag_source`로 manual / ai_suggested / ai_verified_human_approved 등을 구분할 수 있습니다.

기존 Supabase 프로젝트에 `SUPABASE_V23_TAG_MIGRATION.sql`은 선택적으로 실행하면 됩니다.
이 마이그레이션을 실행하지 않아도 V23 호텔 조회/추천은 동작합니다.
