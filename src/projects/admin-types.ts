import type { Project, Job } from "./types";

export const ADMIN_SECTIONS = {
  users: { title: "사용자 관리", description: "계정별 작업 현황을 확인하고 크레딧과 결과물을 관리하세요." },
  projects: { title: "프로젝트 관리", description: "모든 사용자의 프로젝트와 콘텐츠 구성을 확인하세요." },
  activity: { title: "생성 내역", description: "이미지·영상 생성 요청과 처리 상태를 확인하세요." },
};
export const JOB_STATES: Record<Job["state"], string> = { submitting: "접수 중", pending: "생성 중", completed: "완료", failed: "실패 · 환불", unknown: "접수 확인 필요" };
export type AdminUserRow = { id: string; username: string | null; name: string; email: string; credits: number; is_admin: boolean; created_at: string; projects: number; jobs: number; files: number };
export type AdminProjectRow = { id: string; owner_id: string; username: string | null; owner_name: string; title: string; format: string; slots: number; updated_at: string; deleted_at: string | null; version: number; document: Project };
export type AdminJobRow = { id: string; user_id: string; username: string | null; owner_name: string; state: Job["state"]; request_id: string | null; project_id: string | null; project_title: string | null; feature: string; model: string; prompt: string; cost: number; created_at: string };
export type AdminRows = { users: AdminUserRow; projects: AdminProjectRow; activity: AdminJobRow };
export type AdminList<T> = { items: T[]; total: number; page: number; pages: number };
export type AdminDashboard = { users: number; projects: number; files: number; storage: string; jobs: number; completed: number; pending: number; failed: number; unknown: number; balance: string; granted: string; held: string; refunded: string; recent: AdminJobRow[]; allowedIps: string[] };
