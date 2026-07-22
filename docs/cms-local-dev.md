# Website CMS — 로컬 개발 환경

프로덕션은 Vercel + 자체 호스팅 Postgres(PgBouncer) + S3 호환 스토리지다.
접속 정보가 도착하기 전까지 로컬은 Homebrew Postgres + MinIO로 동일한 구조를 재현한다.
(이 Mac에는 Docker가 없어 스펙의 Docker 구성 대신 Homebrew를 사용한다 — 2026-07-22 승인.)

## 1회 설정

```bash
# Postgres 16 (이미 설치되어 있으면 시작만)
brew install postgresql@16
brew services start postgresql@16
createdb -h localhost keybase_cms        # 개발용
createdb -h localhost keybase_cms_test   # 테스트용 (테스트가 truncate함)

# MinIO (S3 호환 오브젝트 스토리지)
brew install minio minio-mc
brew services start minio                # 기본 계정 minioadmin/minioadmin, :9000
mc alias set localminio http://127.0.0.1:9000 minioadmin minioadmin
mc mb --ignore-existing localminio/keybase-cms-media
mc anonymous set download localminio/keybase-cms-media   # 공개 읽기(사이트 렌더용)
```

## .env.local

```bash
# CMS 콘텐츠 저장소 — Postgres가 기본. 파일 저장은 CMS_STORE=file 명시 시에만.
DATABASE_URL=postgres://<user>@localhost:5432/keybase_cms
CMS_TEST_DATABASE_URL=postgres://<user>@localhost:5432/keybase_cms_test

# 미디어 오브젝트 스토리지 (프로덕션 접속 정보 도착 시 값만 교체)
MEDIA_S3_ENDPOINT=http://127.0.0.1:9000
MEDIA_S3_REGION=us-east-1
MEDIA_S3_BUCKET=keybase-cms-media
MEDIA_S3_ACCESS_KEY_ID=minioadmin
MEDIA_S3_SECRET_ACCESS_KEY=minioadmin
MEDIA_S3_FORCE_PATH_STYLE=true
NEXT_PUBLIC_MEDIA_BASE_URL=http://127.0.0.1:9000/keybase-cms-media
```

## 데이터 이관과 테스트

```bash
npm run cms:migrate   # data/cms/*.json → Postgres (멱등, 원본 보존)
npm test              # 파일·Postgres 두 백엔드 모두 검증
npm run dev           # http://localhost:3000/website-admin-cms
```

## 프로덕션 전환 시 (Vercel 환경변수)

- `DATABASE_URL` — PgBouncer(transaction mode) 경유 URL
- `MEDIA_S3_*` — 자체 호스팅 스토리지 접속 정보
- `NEXT_PUBLIC_MEDIA_BASE_URL` — 미디어 공개 도메인(CDN). 콘텐츠는 키만 저장하므로
  도메인 변경은 이 변수 하나만 바꾸면 된다
- `ADMIN_SESSION_SECRET` — 세션 토큰 솔트

스토리지 쪽 요구사항 (백엔드 담당자):
- 버킷 공개 읽기(또는 CDN 경유 읽기) 허용
- 브라우저 presigned PUT을 위한 CORS: 사이트 오리진에서 `PUT` 허용, `Content-Type` 헤더 허용

롤백 절차는 [cms-storage-rollback.md](cms-storage-rollback.md) 참조.
