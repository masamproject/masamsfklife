export type Plan = "free" | "pro";

export const PLAN_LIMITS: Record<Plan, { lists: number }> = {
  free: { lists: 3 },
  pro: { lists: Number.POSITIVE_INFINITY },
};
