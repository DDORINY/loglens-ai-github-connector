# LogLens AI GitHub Connector

GitHub Actions 실패 로그와 서버 로그를 분석하고, 커밋·Pull Request 변경사항 및 발생 시간대를 함께 비교해 장애 원인 후보와 조치 항목을 제공하는 개발자용 AIOps 보조 플랫폼입니다.

현재 분석 기능은 외부 AI API를 호출하지 않는 **rule-based analysis engine**으로 구현되어 있습니다. 분석 결과를 재현 가능하게 만들고, 원인을 단정하는 대신 근거·점수·원인 후보·권장 조치를 분리해 제공합니다.

## 프로젝트 소개

장애 대응 과정에서는 보통 다음 작업이 반복됩니다.

```text
실패한 Actions run 확인
→ 원본 로그에서 핵심 오류 탐색
→ 최근 커밋과 PR 변경 파일 확인
→ 서버 로그와 발생 시간 비교
→ 원인 후보 및 조치 내용 작성
→ GitHub Issue 생성
```

LogLens는 이 흐름을 하나의 서비스로 연결합니다.

- GitHub 저장소 및 Actions run 조회
- 실패 로그 다운로드와 핵심 패턴 분석
- head SHA 기준 커밋, PR, 변경 파일 조회
- 서버 로그 업로드, 오류 그룹핑 및 category 분류
- CI 리포트와 서버 로그 리포트의 자동 후보 추천
- 통합 장애 리포트 생성
- 분석 결과 기반 GitHub Issue 생성

> 로그는 증상이고, 코드 변경 이력은 원인 후보입니다.

## 핵심 문제

### 1. 실패 로그가 길고 핵심 원인을 찾기 어렵다

GitHub Actions 로그에는 빌드 출력, 설치 로그, timestamp, ANSI 색상 코드가 섞여 있습니다. 개발자는 실제 실패 원인을 보여주는 몇 줄을 찾기 위해 전체 로그를 반복해서 확인해야 합니다.

LogLens는 패턴 매칭을 통해 실패 category, 핵심 근거 로그, 원인 후보와 권장 조치를 구조화합니다.

### 2. 로그와 코드 변경사항이 분리되어 있다

오류가 발생하면 개발자는 GitHub Actions, commit, PR, 변경 파일을 각각 이동하며 확인합니다.

LogLens는 Actions run의 `head_sha`를 기준으로 관련 commit, PR과 변경 파일을 조회하고 로그 키워드와의 연관 점수를 제공합니다.

### 3. CI 실패와 서버 장애의 시간적 연관성을 사람이 판단해야 한다

CI 분석 리포트와 서버 로그 분석 리포트가 별도로 존재하면 어떤 서버 로그가 해당 실패와 관련 있는지 판단하기 어렵습니다.

LogLens는 같은 프로젝트의 최근 서버 로그 분석 리포트를 대상으로 category와 발생 시간 차이를 계산해 통합 장애 후보를 추천합니다.

### 4. 장애 보고와 후속 작업 작성이 반복된다

분석 결과를 다시 정리해 Issue나 장애 보고서로 작성하는 작업은 시간이 오래 걸리고 형식도 일정하지 않습니다.

LogLens는 근거, 원인 후보, 권장 조치가 포함된 분석 리포트와 GitHub Issue를 생성하고 이력을 저장합니다.

## 기능 흐름

### GitHub Actions 실패 분석

```text
프로젝트 생성
→ GitHub 저장소 연결
→ 실패한 Actions run 조회
→ 실패 로그 확인
→ Analysis Engine v2 원인 분석
→ 커밋/PR 변경사항 확인
→ GitHub Issue 및 분석 리포트 생성
```

Actions 분석 결과:

- `category`
- `summary`
- `confidence`
- `evidence`
- `suspected_causes`
- `recommended_actions`
- `matched_patterns`
- `analysis_score`
- `engine_version`

### 변경사항 컨텍스트 분석

```text
Actions run의 head SHA 확인
→ GitHub commit 조회
→ 연결된 Pull Request 조회
→ PR 또는 commit 변경 파일 조회
→ 실패 로그 키워드와 파일 경로 비교
→ relevance score와 판단 근거 생성
```

커밋 해시는 실제 GitHub commit 페이지와 연결되며 새 탭에서 전체 diff를 확인할 수 있습니다.

### 서버 로그 분석

```text
서버 로그 업로드
→ 오류 라인 추출
→ severity 판정
→ 유사 오류 fingerprint 그룹핑
→ category 분류
→ 원인 후보 및 권장 조치 생성
→ 서버 로그 분석 리포트 저장
```

지원 파일 형식:

- `.log`
- `.txt`

파일 크기는 최대 2MB이며 UTF-8 또는 CP949 텍스트를 처리합니다.

주요 서버 로그 category:

- `DATABASE_ERROR`
- `NETWORK_ERROR`
- `HTTP_5XX_ERROR`
- `AUTH_ERROR`
- `PERMISSION_ERROR`
- `APPLICATION_ERROR`
- `UNKNOWN_LOG_PATTERN`

### 통합 장애 후보 추천

```text
GitHub Actions 분석 리포트 선택
→ 같은 프로젝트의 최근 서버 로그 리포트 조회
→ category match score 계산
→ time match score 계산
→ candidate score 계산
→ 점수가 높은 후보 순으로 추천
→ 1순위 후보로 통합 장애 리포트 생성
```

후보 점수 계산:

```text
candidate_score
= category_match_score × 0.60
+ time_match_score × 0.40
```

시간 점수 정책:

| 시간 차이 | 점수 |
| --- | ---: |
| 0~30분 | 100 |
| 30분 초과~2시간 | 80 |
| 2시간 초과~6시간 | 60 |
| 6시간 초과~24시간 | 30 |
| 24시간 초과 | 10 |

통합 장애 리포트는 다음 정보를 제공합니다.

- 통합 summary
- combined evidence
- root cause candidates
- recommended actions
- severity
- analysis score
- 사용된 CI/서버 로그 리포트 연결 정보

## 아키텍처

```text
┌──────────────────────────────────────────────────────────┐
│ Frontend: Next.js 16 + React 19 + TypeScript + Tailwind │
│                                                          │
│ Dashboard / Projects / Repositories / Reports            │
│ Server Logs / Incident Candidates / Incident Reports     │
└───────────────────────────┬──────────────────────────────┘
                            │ JWT Bearer Token
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Backend: FastAPI + SQLAlchemy                            │
│                                                          │
│ Auth API                                                 │
│ Project API                                              │
│ GitHub Connector ───────────────► GitHub REST API        │
│ Actions Analysis Engine v2                               │
│ Change Context Service                                   │
│ Server Log Analysis Engine v1                            │
│ Incident Recommendation Engine v1                        │
│ GitHub Issue Creator                                     │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL 16                                            │
│                                                          │
│ users / projects / github_repositories                   │
│ ci_analysis_reports / server_logs                        │
│ server_log_analysis_reports / incident_reports           │
└──────────────────────────────────────────────────────────┘
```

### 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Pydantic 2 |
| Database | PostgreSQL 16 |
| ORM / Migration | SQLAlchemy 2, Alembic |
| 인증 | JWT Bearer Authentication |
| GitHub 연동 | GitHub REST API |
| 로그 분석 | Python regex 기반 rule engine |
| 보안 | Fernet PAT 암호화, 민감정보 마스킹 |
| 개발 환경 | Docker Compose, Uvicorn |

## API 목록

모든 주요 API는 `/api` prefix를 사용하며 인증이 필요한 요청에는 다음 헤더가 필요합니다.

```http
Authorization: Bearer {access_token}
```

### 인증

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 및 JWT 발급 |
| `GET` | `/api/auth/me` | 현재 사용자 조회 |

### 프로젝트

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/projects` | 프로젝트 생성 |
| `GET` | `/api/projects` | 프로젝트 목록 |
| `GET` | `/api/projects/{projectId}` | 프로젝트 상세 |
| `PATCH` | `/api/projects/{projectId}` | 프로젝트 수정 |
| `DELETE` | `/api/projects/{projectId}` | 프로젝트 삭제 |

### GitHub 및 Actions

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/github/repositories/connect` | GitHub 저장소 연결 |
| `GET` | `/api/github/repositories?project_id={id}` | 프로젝트 저장소 목록 |
| `GET` | `/api/github/repositories/{repositoryId}` | 저장소 상세 |
| `GET` | `/api/github/repositories/{repositoryId}/actions/runs` | Actions run 조회 |
| `GET` | `/api/github/repositories/{repositoryId}/actions/runs/{runId}/logs` | 실패 로그 조회 |
| `GET` | `/api/github/repositories/{repositoryId}/actions/runs/{runId}/analysis` | 실패 원인 분석 |
| `GET` | `/api/github/repositories/{repositoryId}/actions/runs/{runId}/context` | 커밋·PR 변경사항 분석 |
| `POST` | `/api/github/repositories/{repositoryId}/actions/runs/{runId}/issues` | GitHub Issue 생성 |

### Actions 분석 리포트

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/analysis-reports?repository_id={id}` | 저장소별 리포트 목록 |
| `GET` | `/api/analysis-reports/{reportId}` | 리포트 상세 |

### 서버 로그

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/server-logs/upload` | 서버 로그 업로드 |
| `GET` | `/api/server-logs?project_id={id}` | 프로젝트 서버 로그 목록 |
| `GET` | `/api/server-logs/{logId}` | 서버 로그 상세 |
| `POST` | `/api/server-logs/{logId}/analyze` | 서버 로그 분석 |
| `GET` | `/api/server-logs/{logId}/reports` | 로그별 분석 리포트 목록 |
| `GET` | `/api/server-logs/reports/{reportId}` | 서버 로그 리포트 상세 |

### 통합 장애 리포트

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/incidents` | CI/서버 로그 리포트 ID로 통합 리포트 생성 |
| `GET` | `/api/incidents?project_id={id}` | 프로젝트 통합 리포트 목록 |
| `GET` | `/api/incidents/{incidentId}` | 통합 리포트 상세 |
| `GET` | `/api/incidents/candidates?project_id={id}&github_analysis_report_id={reportId}&limit=5` | 서버 로그 후보 추천 |
| `POST` | `/api/incidents/auto` | 추천 1순위 후보로 통합 리포트 자동 생성 |

### 상태 확인

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/health` | API 상태 확인 |
| `GET` | `/db-health` | PostgreSQL 연결 확인 |

## DB 구조

### ERD

```text
users
  1 ─── N projects

projects
  1 ─── N github_repositories
  1 ─── N server_logs
  1 ─── N server_log_analysis_reports
  1 ─── N incident_reports

github_repositories
  1 ─── N ci_analysis_reports

server_logs
  1 ─── N server_log_analysis_reports

ci_analysis_reports
  1 ─── N incident_reports

server_log_analysis_reports
  1 ─── N incident_reports
```

### 주요 테이블

| 테이블 | 역할 | 주요 필드 |
| --- | --- | --- |
| `users` | 사용자 계정 | `email`, `password_hash` |
| `projects` | 분석 단위 프로젝트 | `user_id`, `name`, `description` |
| `github_repositories` | GitHub 저장소 연결 | `project_id`, `owner`, `repo`, `token_encrypted` |
| `ci_analysis_reports` | Actions 분석 및 Issue 이력 | `github_run_id`, `category`, `evidence`, `analysis_score`, `engine_version` |
| `server_logs` | 업로드된 서버 로그 원본 | `project_id`, `filename`, `raw_content` |
| `server_log_analysis_reports` | 서버 로그 분석 결과 | `category`, `severity`, `error_groups`, `analysis_score` |
| `incident_reports` | CI와 서버 로그를 연결한 통합 리포트 | `combined_evidence`, `root_cause_candidates`, `recommended_actions` |

`incident_reports`는 다음 세 필드 조합에 unique constraint를 적용합니다.

```text
project_id
+ github_analysis_report_id
+ server_log_analysis_report_id
```

따라서 같은 분석 조합을 반복 생성해도 중복 데이터가 쌓이지 않고 기존 리포트를 반환합니다.

구조화된 evidence, error group, 원인 후보 및 권장 조치는 PostgreSQL `JSONB`로 저장합니다.

## 시연 시나리오

### 시나리오 1. GitHub Actions 실패 분석과 Issue 생성

1. 회원가입 후 로그인합니다.
2. 프로젝트를 생성합니다.
3. GitHub 저장소 owner, repo, PAT를 입력해 저장소를 연결합니다.
4. 저장소 화면에서 실패한 Actions run을 조회합니다.
5. 커밋 해시 또는 브랜치로 run을 검색합니다.
6. `실패 로그`에서 GitHub Actions 원본 로그를 확인합니다.
7. `원인 분석`에서 score, category, 핵심 근거 로그와 감지 패턴을 확인합니다.
8. `커밋/PR 보기`에서 commit, PR, 변경 파일과 relevance score를 확인합니다.
9. `Issue 생성`으로 GitHub Issue와 Actions 분석 리포트를 저장합니다.

### 시나리오 2. 서버 로그 분석

1. 서버 로그 화면에서 프로젝트와 로그 파일을 선택합니다.
2. 로그를 업로드합니다.
3. 분석을 실행해 severity, category, 핵심 근거와 반복 오류 그룹을 확인합니다.
4. 서버 로그 분석 리포트 상세에서 원인 후보와 권장 조치를 확인합니다.

### 시나리오 3. 통합 장애 후보 추천과 리포트 생성

1. Actions 분석 리포트 상세로 이동합니다.
2. `서버 로그 후보 추천`을 실행합니다.
3. 후보별 category score, time score, candidate score와 매칭 근거를 비교합니다.
4. 추천 1순위 후보로 통합 장애 리포트를 생성합니다.
5. 통합 리포트 상세에서 다음 내용을 확인합니다.
   - analysis score와 severity
   - combined evidence
   - root cause candidates
   - recommended actions
   - 연결된 Actions/서버 로그 원본 리포트

## 기술적 차별점

### 재현 가능한 rule-based 분석

외부 LLM 응답에 의존하지 않고 정규식과 명시적인 규칙으로 결과를 생성합니다. 같은 입력에 같은 category와 점수가 생성되어 분석 근거를 추적하기 쉽습니다.

### 로그와 변경사항을 분리하지 않는 분석 흐름

Actions 로그만 요약하지 않고 `head_sha` 기준 commit, PR, 변경 파일을 함께 제공합니다. 커밋 해시를 클릭하면 실제 GitHub diff로 바로 이동할 수 있습니다.

### category와 시간을 결합한 장애 후보 추천

CI 실패와 서버 로그 리포트의 연관성을 category 60%, 시간 40%로 계산합니다. 추천 결과에 최종 점수뿐 아니라 각 점수와 판단 근거를 모두 노출합니다.

### 원인을 단정하지 않는 결과 구조

분석 결과를 summary, evidence, suspected causes, recommended actions로 분리합니다. 사용자가 근거를 검토하고 최종 판단할 수 있도록 설계했습니다.

### 멱등성을 보장하는 통합 리포트 생성

애플리케이션 사전 조회와 PostgreSQL unique constraint를 함께 사용합니다. 동시에 같은 생성 요청이 들어와도 `IntegrityError`를 rollback하고 기존 리포트를 반환합니다.

### GitHub PAT 보호

GitHub PAT는 Fernet으로 암호화해 저장하고 프론트 화면이나 API 응답에 노출하지 않습니다. 로그 분석 과정에서는 토큰, Authorization 헤더 등 민감정보 패턴을 마스킹합니다.

## 로컬 실행

### 1. PostgreSQL 실행

```bash
docker compose up -d postgres
```

### 2. Backend 설정

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Fernet 키 생성:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

`backend/.env` 예시:

```env
DATABASE_URL=postgresql://loglens:loglens1234@localhost:5432/loglens_db
JWT_SECRET_KEY=replace-with-a-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GITHUB_TOKEN_ENCRYPTION_KEY=replace-with-generated-fernet-key
```

마이그레이션과 API 실행:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API 문서:

```text
http://localhost:8000/docs
```

### 3. Frontend 실행

```bash
cd frontend
npm install
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

웹 애플리케이션:

```text
http://localhost:3000
```

### 검증 명령

```bash
cd backend
python -m compileall -q app alembic
alembic check

cd ../frontend
npm run lint
npm run build
```

## 현재 범위

구현 완료:

- JWT 회원가입 및 로그인
- 프로젝트 및 GitHub 저장소 연결
- 실패 Actions run 조회·검색·페이징
- 실패 로그, 원인 분석, 변경사항 컨텍스트
- GitHub Issue 및 Actions 분석 리포트 생성
- 서버 로그 업로드·분석·오류 그룹핑
- 서버 로그 후보 추천
- 통합 장애 리포트 생성·목록·상세

향후 확장:

- GitHub App 인증
- GitHub Webhook 기반 자동 분석
- Slack 알림
- 유사 장애 검색
- 운영 환경 배포 자동화
