# LogLens AI GitHub Connector

## 1. 프로젝트 소개

**LogLens AI GitHub Connector**는 GitHub Actions 실패 로그와 운영 서버 로그를 분석하고, 최근 PR·커밋 변경사항과 연결해 AI가 장애 원인 후보, 확인 절차, 재발 방지책, GitHub Issue를 자동 생성하는 개발자용 AIOps 보조 플랫폼입니다.

단순히 로그를 요약하는 서비스가 아니라, 개발자가 장애 상황에서 반복적으로 수행하는 **로그 확인 → 변경 이력 추적 → 원인 후보 정리 → 리포트 작성 → Issue 생성** 과정을 자동화하는 것을 목표로 합니다.

---

## 2. 프로젝트 배경

개발 프로젝트에서는 다음과 같은 문제가 자주 발생합니다.

* GitHub Actions 빌드/테스트/배포 실패 로그가 길고 복잡함
* 운영 서버에서 500, 502, 503, 504 오류가 발생했을 때 원인 추적이 어려움
* 장애 발생 시간과 최근 PR·커밋·배포 이력을 사람이 직접 비교해야 함
* 장애 보고서와 GitHub Issue를 수동으로 작성해야 함
* 주니어 개발자는 어떤 로그와 변경사항을 먼저 봐야 하는지 판단하기 어려움

이 프로젝트는 이러한 문제를 해결하기 위해 **GitHub Actions 분석, 서버 로그 분석, AI 장애 리포트 생성, GitHub Issue 자동 생성**을 하나의 흐름으로 연결합니다.

---

## 3. 핵심 가치

이 프로젝트의 핵심 인사이트는 다음과 같습니다.

> 로그는 증상이고, GitHub 변경 이력은 원인 후보입니다.

따라서 장애 분석은 로그만 보는 것이 아니라, 장애 발생 시점 전후의 PR, 커밋, Actions 실패 로그를 함께 분석해야 합니다.

또한 AI는 장애 원인을 단정하지 않고 다음 정보를 제공합니다.

* 원인 후보
* 판단 근거
* 신뢰도
* 확인 절차
* 조치 항목
* 재발 방지책

---

## 4. 주요 기능

### 4.1 GitHub 저장소 연결

* GitHub 저장소 owner/repo 등록
* GitHub Personal Access Token 기반 연결
* 최근 workflow run 조회
* 최근 PR 조회
* 최근 commit 조회
* GitHub Issue 생성

---

### 4.2 GitHub Actions 실패 분석

* 실패한 workflow run 감지
* 실패 로그 다운로드
* build/test/deploy 실패 원인 요약
* TypeScript, ESLint, pytest, Docker build 등 오류 유형 분석
* AI 기반 수정 방향 제안
* GitHub Issue 자동 생성

---

### 4.3 서버 로그 업로드 및 분석

* `.log`, `.txt`, `.jsonl`, `.csv` 로그 파일 업로드
* 로그 라인 파싱
* ERROR/WARN/CRITICAL 집계
* HTTP 5xx 오류 탐지
* 에러 그룹핑
* 장애 후보 탐지

---

### 4.4 장애 후보 탐지

다음 조건을 기반으로 장애 후보를 탐지합니다.

| 조건                    | 판단                 |
| --------------------- | ------------------ |
| 5분 내 ERROR 30건 이상     | 장애 후보              |
| 특정 API 500 오류 10건 이상  | API 장애 후보          |
| 동일 에러 20회 이상 반복       | 반복 장애 후보           |
| 502/503/504 급증        | 외부 연동 또는 프록시 장애 후보 |
| DB timeout 반복         | DB 장애 후보           |
| connection refused 반복 | 서비스 다운 후보          |

---

### 4.5 GitHub 변경사항 연관 분석

장애 발생 시간 기준으로 최근 PR과 커밋을 조회합니다.

분석 대상:

* 최근 병합된 PR
* 최근 commit
* 변경 파일 목록
* PR 제목/본문
* Actions 실패 내역

이를 바탕으로 장애 로그와 코드 변경사항의 연관 가능성을 분석합니다.

---

### 4.6 AI 장애 리포트 생성

AI는 다음 구조의 장애 리포트를 생성합니다.

* 장애 개요
* 영향 범위
* 주요 로그 패턴
* 관련 GitHub 변경사항
* 원인 후보
* 확인 작업
* 조치 제안
* 재발 방지

---

### 4.7 GitHub Issue 자동 생성

사용자가 승인하면 AI가 생성한 장애 리포트를 GitHub Issue로 등록합니다.

예시 Issue 제목:

```txt
[INCIDENT] CCTV stream API 500 after AI VM relay changes
```

---

## 5. 서비스 흐름

### GitHub Actions 실패 분석 흐름

```txt
GitHub 저장소 연결
→ 최근 workflow run 조회
→ failed workflow 감지
→ 실패 로그 다운로드
→ AI 실패 원인 분석
→ 수정 체크리스트 생성
→ GitHub Issue 생성
```

### 서버 로그 기반 장애 분석 흐름

```txt
서버 로그 업로드
→ 로그 파싱
→ 에러 그룹핑
→ 장애 후보 탐지
→ 장애 발생 시간 계산
→ 최근 PR/커밋 조회
→ AI 장애 리포트 생성
→ GitHub Issue 생성
```

---

## 6. 기술 스택

| 영역        | 기술                                              |
| --------- | ----------------------------------------------- |
| Frontend  | Next.js, TypeScript                             |
| Backend   | FastAPI                                         |
| Database  | PostgreSQL                                      |
| ORM       | SQLAlchemy                                      |
| AI API    | OpenAI API 또는 Gemini API                        |
| 인증        | JWT                                             |
| GitHub 연동 | GitHub REST API                                 |
| 로그 파싱     | Python regex, pandas                            |
| 차트        | Recharts                                        |
| 리포트       | Markdown, PDF                                   |
| 배포        | Docker Compose                                  |
| 고도화       | Chrome Extension, GitHub Webhook, Slack Webhook |

---

## 7. 시스템 아키텍처

```txt
[Frontend - Next.js]
  ├─ Dashboard
  ├─ Project Management
  ├─ GitHub Repository Connect
  ├─ Actions Failure Viewer
  ├─ Log Upload
  ├─ Incident List
  ├─ Incident Detail
  ├─ AI Report Viewer
  └─ GitHub Issue Create

[Backend - FastAPI]
  ├─ Auth API
  ├─ Project API
  ├─ GitHub Connector
  ├─ Actions Log Collector
  ├─ Log Upload API
  ├─ Log Parser
  ├─ Error Grouping Service
  ├─ Incident Detection Service
  ├─ AI Analysis Service
  ├─ Report Generator
  └─ GitHub Issue Creator

[Database - PostgreSQL]
  ├─ users
  ├─ projects
  ├─ github_repositories
  ├─ github_workflow_runs
  ├─ log_entries
  ├─ error_groups
  ├─ incidents
  ├─ incident_reports
  └─ incident_github_links
```

---

## 8. MVP 범위

### 1차 MVP

* 회원가입/로그인
* 프로젝트 생성
* GitHub 저장소 연결
* GitHub Actions 실패 workflow 조회
* 실패 로그 다운로드
* AI 실패 원인 요약
* GitHub Issue 생성

### 2차 MVP

* 서버 로그 업로드
* 로그 파싱
* 에러 그룹핑
* 장애 후보 탐지
* 장애 리포트 생성

### 3차 MVP

* 장애 발생 시간 기준 최근 PR/커밋 조회
* GitHub 변경사항 연관 분석
* AI 장애 리포트 고도화
* Markdown/PDF 리포트 다운로드

### 고도화

* Chrome Extension
* GitHub Webhook
* Slack 알림
* 유사 장애 검색
* GitHub App 전환

---

## 9. 포트폴리오 설명 문장

> LogLens AI GitHub Connector는 GitHub Actions 실패 로그와 운영 서버 로그를 분석해 장애 후보를 탐지하고, 최근 PR·커밋 변경사항과 연결하여 AI가 원인 후보, 확인 절차, 재발 방지책이 포함된 장애 리포트와 GitHub Issue를 자동 생성하는 개발자용 AIOps 보조 플랫폼입니다.

---

## 10. 프로젝트 차별점

* 단순 로그 요약기가 아니라 GitHub 변경 이력과 연결
* GitHub Actions 실패 로그를 AI가 분석
* 운영 로그 기반 장애 후보 탐지
* AI가 원인 후보와 확인 절차를 분리해서 제공
* GitHub Issue 자동 생성으로 실제 작업 항목까지 연결
* 향후 Chrome Extension, Slack, Webhook으로 확장 가능

---

## 11. 실행 예시

```txt
1. 사용자가 GitHub 저장소를 연결한다.
2. 최근 failed workflow를 조회한다.
3. 실패 로그를 다운로드한다.
4. AI가 실패 원인과 수정 방향을 요약한다.
5. 사용자가 Issue 생성 버튼을 누른다.
6. GitHub 저장소에 장애/오류 Issue가 자동 등록된다.
```

---

## 12. 최종 목표

개발자가 오류 발생 후 GitHub와 서버 로그를 직접 오가며 확인하지 않아도, 시스템이 실패 로그와 변경 이력을 자동으로 수집하고 AI가 원인 후보와 조치 방향을 정리해주는 개발자용 AI 장애 대응 도구를 만드는 것이 목표입니다.
