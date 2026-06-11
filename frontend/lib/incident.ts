import type { IncidentReport } from "@/types/api";

export const INCIDENT_CATEGORY_LABELS: Record<string, string> = {
  DATABASE_ERROR: "DB 오류",
  NETWORK_ERROR: "네트워크 오류",
  HTTP_5XX_ERROR: "서버 응답 오류",
  AUTH_ERROR: "로그인·인증 오류",
  PERMISSION_ERROR: "권한 오류",
  APPLICATION_ERROR: "애플리케이션 오류",
  TEST_FAILURE: "테스트 실패",
  TYPESCRIPT_BUILD_ERROR: "코드 빌드 실패",
  DOCKER_BUILD_ERROR: "배포 이미지 생성 실패",
  PYTHON_DEPENDENCY_ERROR: "Python 설치 오류",
  NODE_DEPENDENCY_ERROR: "Node.js 설치 오류",
};

export function incidentCategories(title: string): string[] {
  const match = title.match(/\[INCIDENT\]\s+([A-Z0-9_]+)와\s+([A-Z0-9_]+)/);
  return match ? [match[1], match[2]] : [];
}

export function friendlyIncidentTitle(report: IncidentReport): string {
  const categories = incidentCategories(report.title);
  if (categories.length === 2) {
    return `${INCIDENT_CATEGORY_LABELS[categories[0]] ?? categories[0]}와 ${INCIDENT_CATEGORY_LABELS[categories[1]] ?? categories[1]}가 함께 발생했습니다`;
  }
  return "서로 관련 있을 수 있는 두 오류가 발견되었습니다";
}

export function severityLabel(value: string): string {
  const labels: Record<string, string> = {
    critical: "매우 높음",
    high: "높음",
    medium: "보통",
    low: "낮음",
  };
  return labels[value.toLowerCase()] ?? value;
}
