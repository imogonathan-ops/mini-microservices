import { request } from "../client";
import { normalizeJob, unwrapList } from "../normalizers";
import type { Job } from "../../types/domain";

export async function getJobs(): Promise<Job[]> {
  const payload = await request<unknown>("/jobs", {}, "reports");
  return unwrapList(payload, "jobs").map(normalizeJob);
}
export async function createReportJob(): Promise<unknown> {
  // API conseillée : HTTP 202 + {jobId, status:'waiting'} ; pas de génération bloquante.
  return request<unknown>("/reports", {
    method: "POST",
    body: JSON.stringify({
      type: "daily",
      date: new Date().toISOString().slice(0, 10),
    }),
  }, "reports");
}
