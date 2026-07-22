# Keybase Website CMS — 개발 지시서

## 0. 사용법

이 문서를 레포 루트에 `docs/website-cms-spec.md`로 커밋한 뒤, 아래 문장으로 작업을 시작한다.

> `docs/website-cms-spec.md`를 읽고 Section 3(현황 검증)부터 수행해. Phase 1이 끝나면 멈추고 보고할 것.

Phase가 끝날 때마다 사람이 확인한 뒤 다음 Phase를 지시한다. **한 번에 전부 시키지 않는다.**

---

## 1. 컨텍스트

Keybase의 공개 마케팅 사이트와 그것을 편집하는 CMS를 개발한다. 목표는 비개발자(마케팅 담당)가 코드 없이 사이트를 편집하고, 외주 에이전시 의존을 제거하는 것.

**현재 상태 (검증 필요 — Section 3 참조)**

- Next.js App Router. 공개 마케팅 사이트와 CMS가 같은 앱에 존재
- CMS 경로: `/admin/*` — **이번 작업에서 `/website-admin-cms/*`로 이전한다**
- 저장소: 파일 기반. `lib/cms/store.ts`가 `data/cms/<resource>.json`에 원자적 쓰기
- 편집 단위: `CmsDoc = { draft, published, versions[], publishedAt, publishedBy }`
- Draft → Publish → Version 복원 엔진이 전 리소스 공통
- 라이브 프리뷰: `/api/admin/preview`가 인증 후 `draftMode()` 활성화 → 편집기 우측 iframe에 실제 페이지 표시. 1초 debounce 자동저장 후 iframe 새로고침
- 인증: 쿠키 세션 (`lib/admin/auth.ts`), `ADMIN_USERS` 허용목록
- Publish 시 ISR revalidate
- 테스트: `lib/cms/{store,service,normalize}.test.ts`, `lib/admin/auth.test.ts`

**이미 CMS로 편집 가능한 리소스 (11개)**

Overview 대시보드, Key Executives, Navigation, Footer, Global Settings, Service Pages(16개, hero + SEO만), Company Pages(About/CEO Message의 hero/heading/intro/SEO만), Careers, Newsroom, Media Library, History

**아직 하드코딩된 영역 (이번 작업의 주요 대상)**

- 서비스 페이지의 본문 딥 섹션
- About 페이지의 values 그리드
- CEO 편지 본문
- 홈페이지 전체
- `our-advisors`, `contact`, `become-an-advisor` (공통 헤더·푸터만 CMS)

**알려진 치명적 문제**

`data/`는 gitignore된 런타임 상태다. 파일시스템이 초기화되는 서버리스 환경(Vercel 등)에 배포하면 편집 내용이 전부 소실된다. Phase 1에서 반드시 해결한다.

---

## 2. 절대 규칙

이 규칙들은 협상 대상이 아니다. 위반이 필요하다고 판단되면 진행하지 말고 물어볼 것.

1. **조용한 폴백 금지.** 설정이 없거나 외부 의존성이 실패하면 대체 동작으로 넘어가지 말고 명시적으로 실패시킨다. 프로덕션에서 DB 설정이 없으면 부팅이 실패해야 한다. 파일 저장으로 슬쩍 넘어가면 안 된다. 목 데이터, 랜덤 폴백, 빈 배열 반환으로 에러를 숨기는 것 모두 금지.

2. **기존 엔진을 재작성하지 않는다.** `CmsDoc` 구조와 draft/publish/version 로직은 이미 검증됐고 전 리소스가 공유한다. 저장 **백엔드**만 교체하고 인터페이스와 데이터 구조는 유지한다.

3. **라이브 프리뷰는 반드시 계속 동작해야 한다.** `draftMode()` 기반 프리뷰는 이 CMS의 핵심 가치다. 경로를 옮기더라도 관리자만 draft를 보고 일반 방문자는 published만 보는 동작이 유지돼야 한다. 이걸 깨는 변경은 하지 않는다.

4. **범용 페이지 빌더를 만들지 않는다.** 자유 배치 드래그앤드롭, 임의 컬럼 그리드, 스타일 편집기 전부 금지. 섹션 타입은 **기존 사이트 디자인에 실제로 존재하는 것만** 만든다. 새 레이아웃을 발명하지 않는다.

5. **추측하지 않는다.** 코드를 읽고 확인한 사실만 보고한다. 확신이 없으면 "확인 필요"로 표시하고 묻는다. 이 문서의 현황 설명이 실제 코드와 다르면 즉시 지적한다.

6. **새 의존성은 추가 전에 묻는다.** 특히 에디터, UI 라이브러리, ORM. 이름·용량·유지보수 상태·대안을 제시하고 승인을 받는다.

7. **마이그레이션은 되돌릴 수 있게 만든다.** 데이터 이관 스크립트는 원본을 삭제하지 않는다. 롤백 절차를 함께 작성한다.

8. **Phase 경계에서 멈춘다.** 한 Phase를 끝내면 다음으로 넘어가지 말고 변경 요약과 확인 방법을 보고한다.

9. **모든 변경은 감사 로그를 남긴다.** 누가·언제·무엇을·이전값→새값. 기존 History 기능과 통합한다.

---

## 3. 시작 전: 현황 검증

코드를 수정하기 전에 아래를 확인하고 보고한다. **이 단계에서는 파일을 수정하지 않는다.**

1. Section 1의 현황 설명 중 사실과 다른 항목을 전부 지적한다. 파일 경로와 줄 번호를 근거로 제시할 것.
2. 공개 마케팅 사이트와 `/admin`이 같은 Next.js 앱인지 확인한다. (`draftMode()` 사용 위치로 판별)
3. `lib/admin/auth.ts`의 실제 동작을 정확히 서술한다: 비밀번호가 해시되어 있는가, 세션 만료가 있는가, CSRF 보호가 있는가, 로그인 시도 제한이 있는가.
4. `lib/cms/store.ts`의 공개 인터페이스를 나열한다. 어떤 함수를 다른 코드가 호출하는가.
5. 현재 배포 대상이 어디인지 확인한다 (`vercel.json`, `Dockerfile`, CI 설정, `next.config` 등). 서버리스라면 데이터 소실이 **이미 진행 중**임을 경고할 것.
6. `/admin` 경로를 참조하는 모든 위치를 나열한다: 라우트, API, 링크, 리다이렉트, 미들웨어, 테스트, 환경변수.
7. 기존 테스트를 실행하고 결과를 보고한다.

보고 형식: 항목별로 `확인 결과 | 근거 파일:줄번호 | 문서와의 차이`

---

## Phase 1 — 경로 이전 + 영속 저장소

**이 Phase가 끝나면 멈추고 보고한다.**

기능을 추가하기 전에 바닥을 굳히는 단계다. 순서를 바꾸지 않는다.

### 1-A. 영속 저장소 이관

파일 기반 저장을 Postgres로 옮긴다. 데이터 구조는 그대로 유지한다.

`CmsStore` 인터페이스를 정의하고 두 가지 구현을 만든다.

- `PostgresCmsStore` — 프로덕션 및 기본값
- `FileCmsStore` — 로컬 개발 전용. **명시적 환경변수(`CMS_STORE=file`)가 있을 때만 활성화.** 설정 누락 시 자동으로 여기로 떨어지면 안 된다.

프로덕션 빌드에서 `DATABASE_URL`이 없으면 부팅을 실패시킨다.

스키마 초안 (필요시 조정하되, 이관 전에 확정하고 승인받을 것):

```sql
create table cms_documents (
  resource      text not null,
  doc_id        text not null,
  draft         jsonb,
  published     jsonb,
  published_at  timestamptz,
  published_by  text,
  updated_at    timestamptz not null default now(),
  primary key (resource, doc_id)
);

create table cms_versions (
  id          uuid primary key default gen_random_uuid(),
  resource    text not null,
  doc_id      text not null,
  snapshot    jsonb not null,
  label       text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index cms_versions_lookup on cms_versions (resource, doc_id, created_at desc);
```

이관 스크립트를 작성한다. `data/cms/*.json` → DB. **원본 파일을 삭제하지 않는다.** 실행 전후 문서 수와 버전 수를 출력해 대조 가능하게 한다.

기존 `lib/cms/*.test.ts`가 두 구현 모두에 대해 통과해야 한다.

### 1-B. 경로 이전

- `app/admin/**` → `app/website-admin-cms/**`
- `app/api/admin/**` → `app/api/website-admin-cms/**` (호출부 전부 갱신)
- 로그인 페이지는 `/website-admin-cms`. 미인증 접근 시 이 경로에서 로그인 폼을 보여주고, 인증 후 `/website-admin-cms`(Overview 대시보드)로 진입
- 인증된 사용자가 `/website-admin-cms`에 오면 로그인 폼이 아니라 대시보드가 보여야 한다
- 구 `/admin/*`는 대응 경로로 301 리다이렉트. **단, 인증 처리는 하지 않는다** — 리다이렉트만 하고 실제 인증은 새 경로에서만 이루어져야 한다. 인증 진입점이 두 개가 되면 안 된다
- Section 3에서 나열한 모든 참조를 갱신한다

### 1-C. 프리뷰 동작 확인

프리뷰 API 경로가 바뀌었으므로 반드시 재확인한다.

- 관리자 세션으로 프리뷰 진입 → draft 내용이 보이는가
- 세션 없이 같은 URL 접근 → published만 보이는가 (draft 유출 없음)
- 편집 후 1초 debounce 자동저장 → iframe 갱신이 되는가
- Publish → ISR revalidate로 공개 페이지에 즉시 반영되는가

### Phase 1 완료 조건

- [ ] 프로덕션에서 DB 없이 부팅하면 명확한 에러로 실패한다
- [ ] 재배포 후에도 편집 내용이 유지된다 (실제로 배포해서 확인)
- [ ] `/admin/*` 접근 시 새 경로로 301, 구 경로에서는 로그인 불가
- [ ] `/website-admin-cms`에서 로그인 → 대시보드 진입
- [ ] 11개 리소스 전부 편집·발행·버전 복원 동작
- [ ] 프리뷰 4개 항목 전부 통과, draft 유출 없음
- [ ] 기존 테스트 전부 통과 + 새 store 테스트 추가

---

## Phase 2 — 섹션 블록 시스템

하드코딩된 본문을 편집 가능하게 만드는 핵심 단계.

### 접근 방식

먼저 **기존 하드코딩된 JSX를 전수 조사**한다. 서비스 페이지 16개, About, CEO Message, 홈페이지, our-advisors, contact, become-an-advisor의 본문에서 반복되는 시각적 패턴을 목록화한다.

그 목록에서 섹션 타입을 **도출한다**. 발명하지 않는다. 결과는 아마 10~15개 정도의 타입일 것이다 (예: 텍스트 블록, 아이콘 3열 그리드, 이미지+텍스트 좌우 배치, 통계 강조, CTA 배너, FAQ 아코디언, 인용구 등 — 실제 목록은 조사 결과를 따른다).

**조사 결과를 먼저 보고하고 승인받은 뒤** 구현에 들어간다.

### 데이터 모델

```ts
type PageSection = {
  id: string;
  type: string;      // 섹션 레지스트리의 키
  visible: boolean;
  data: unknown;     // 타입별 스키마로 검증
};
```

페이지는 `PageSection[]`을 가지며, 이 배열 전체가 기존 `CmsDoc.draft` 안에 들어간다. 별도 저장 경로를 만들지 않는다.

섹션 레지스트리는 타입별로 렌더 컴포넌트, 편집 스키마, 기본값, 표시 이름을 한곳에 묶는다. 새 섹션 타입 추가가 레지스트리에 항목 하나 추가하는 일이 되어야 한다.

### 편집기 동작

허용: 섹션 추가, 삭제, **위아래 순서 변경**, 표시/숨김 토글, 각 섹션의 필드 편집.

금지: 자유 위치 드래그, 컬럼 분할, 여백/색상/폰트 편집, 임의 HTML 입력.

렌더링은 기존 공개 페이지 컴포넌트를 재사용한다. 편집기용으로 별도 렌더러를 만들면 프리뷰와 실제 페이지가 어긋난다.

### 리치 텍스트

본문 텍스트에 서식이 필요하다. 구현 전에 **두 가지 안을 장단점과 함께 제시하고 승인받는다.** 최소 요건: 굵게, 기울임, 링크, 목록, 소제목. 최대 제약: 임의 HTML 삽입 불가, 인라인 스타일 불가.

### Phase 2 완료 조건

- [ ] 섹션 타입 조사 결과가 문서화되어 있다
- [ ] 서비스 페이지 1개가 본문까지 완전히 CMS로 편집된다
- [ ] 섹션 추가/삭제/순서변경/숨김이 프리뷰에 즉시 반영된다
- [ ] 발행 후 공개 페이지가 편집 전과 시각적으로 동일하다 (회귀 없음)
- [ ] 잘못된 섹션 데이터가 페이지를 깨뜨리지 않는다 (검증 + 안전한 실패)

---

## Phase 3 — 콘텐츠 커버리지 완성

Phase 2의 시스템으로 나머지를 덮는다. **한 번에 하나씩**, 각각 배포하고 확인한 뒤 다음으로 간다.

1. 서비스 페이지 16개 전체 본문
2. About 페이지 values 그리드
3. CEO Message 편지 본문
4. `our-advisors`
5. `become-an-advisor`
6. `contact` (폼 제출 동작은 건드리지 않는다 — 문구와 레이아웃만)
7. 홈페이지 (가장 복잡하므로 마지막)

각 항목마다: 하드코딩 제거 → 섹션으로 이전 → 기존 화면과 픽셀 단위 비교 → 발행 확인.

---

## Phase 4 — 품질 및 보안 마감

### 인증 강화

Section 3의 조사 결과에 따라 부족한 것을 채운다. 최소 요건:

- 비밀번호 해시 저장 (평문·단순 비교 금지)
- 세션 만료 및 갱신
- 로그인 시도 속도 제한
- CSRF 보호
- 로그아웃 시 세션 무효화

### 역할 분리

`ADMIN_USERS` 평면 허용목록을 역할 기반으로 교체한다. 이 CMS에서는 최소 두 역할:

- `website_editor` — 콘텐츠 편집·발행
- `website_admin` — 위 + 사용자 관리 + 버전 삭제

권한 판단은 **한 파일에서만** 이루어져야 한다 (`lib/authz.ts` 등). 여러 곳에 흩어지면 검증이 불가능해진다.

### 콘텐츠 품질 가드

- 이미지 업로드 시 alt 텍스트 필수, 용량 상한, 포맷 변환
- 페이지별 SEO title/description 길이 검증 및 경고
- 발행 전 내부 링크 유효성 검사 (slug 변경 시 깨진 링크 탐지)
- draft와 published의 차이를 보여주는 비교 뷰

### Phase 4 완료 조건

- [ ] 편집자 계정으로 사용자 관리에 접근할 수 없다
- [ ] 권한 판단 로직이 단일 파일에 모여 있다
- [ ] alt 없는 이미지가 발행되지 않는다
- [ ] 깨진 내부 링크가 발행 전에 경고된다

---

## 확인이 필요한 사항

작업 시작 전에 사람에게 물어볼 것:

1. 배포 대상은 어디인가 (Vercel / 영속 디스크 서버 / 기타)
2. Postgres는 어디에 둘 것인가 (신규 Supabase 프로젝트 / Neon / 자체 호스팅)
3. 공개 마케팅 사이트의 디자인 자체를 변경하는가, 아니면 현재 디자인을 유지한 채 편집 가능하게만 만드는가
4. CMS를 실제로 사용할 사람이 몇 명이고 역할이 어떻게 나뉘는가
