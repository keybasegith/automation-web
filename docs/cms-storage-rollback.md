# CMS 저장소 이관 — 롤백 절차

Phase 1-A는 파일 저장(`data/cms/*.json`)을 Postgres로 옮긴다. 이관 스크립트
(`scripts/migrate-cms-to-postgres.mjs`)는 **원본 파일을 절대 삭제하거나 수정하지
않으므로**, 롤백은 저장 백엔드 선택을 되돌리는 것으로 끝난다.

## 로컬에서 파일 저장으로 되돌리기

1. `.env.local`에 `CMS_STORE=file`을 설정한다 (`DATABASE_URL`은 지워도 되고 남겨도 된다 —
   `CMS_STORE=file`이 명시되면 DB는 사용되지 않는다).
2. 서버를 재시작한다. `data/cms/*.json`의 이관 시점 내용이 그대로 다시 사용된다.
3. **주의:** 이관 이후 DB에서 편집한 내용은 파일에 없다. 필요하면 되돌리기 전에
   DB 내용을 파일로 내보낼 것 (아래 참조).

## DB 내용을 파일로 내보내기 (선택)

```sql
-- 리소스별 draft/published 확인
select resource, draft_updated_at, published_at from cms_documents;
```

각 리소스의 최신 상태가 필요하면 `cms_documents`의 `draft`/`published` jsonb를
`data/cms/<resource>.json`의 해당 필드에 붙여 넣는다 (CmsDoc 구조는 동일하다).

## DB 테이블 제거 (완전 롤백)

```sql
drop table if exists cms_versions;
drop table if exists cms_media;
drop table if exists cms_audit;
drop table if exists cms_documents;
```

스키마 적용과 이관은 멱등(`create table if not exists`, `on conflict do nothing`)이므로,
언제든 `npm run cms:migrate`로 다시 이관할 수 있다.

## 프로덕션(Vercel) 주의

Vercel에는 파일 저장으로의 롤백이 **존재하지 않는다** — 런타임 파일시스템이
읽기 전용이다. 프로덕션 롤백은 이전 배포로 되돌리는 것(Vercel의 Instant Rollback)이며,
DB 스키마는 하위 호환이므로 이전 배포도 같은 DB를 계속 사용한다.
