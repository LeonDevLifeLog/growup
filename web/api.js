export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { token, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    throw new ApiError(
      error.name === "TimeoutError"
        ? "请求超时，请稍后重试"
        : "暂时连接不上，请检查网络后重试",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(data.error || "操作未完成，请重试", response.status);
  return data;
}

export const roleNames = {
  user: "待授权用户",
  platform_admin: "平台管理员",
  region_admin: "大区管理员",
  school_admin: "学校管理员",
  student: "学生",
};
export const isAdmin = (user) =>
  !!user &&
  ["platform_admin", "region_admin", "school_admin"].includes(user.role);
export const topics = ["成长烦恼", "校园日常", "家庭关系", "小小确幸"];
export const moodNames = ["很低落", "有点低落", "还不错", "很开心", "超开心"];
export const statusMeta = {
  red: { label: "优先关怀", className: "red" },
  yellow: { label: "需要关注", className: "yellow" },
  green: { label: "状态平稳", className: "green" },
  gray: { label: "观察中", className: "gray" },
};
export function shortDate(date) {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  });
}
export function studentStatus(student) {
  if (student.status !== "gray")
    return statusMeta[student.status] || statusMeta.gray;
  if (!student.lastCheckin) return { label: "样本不足", className: "gray" };
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const last =
    typeof student.lastCheckin === "object"
      ? student.lastCheckin.date
      : student.lastCheckin;
  return (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) /
    86400000 >
    1
    ? { label: "待补充记录", className: "gray" }
    : statusMeta.gray;
}
