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
export const isCareAdmin = (user) =>
  !!user && ["region_admin", "school_admin"].includes(user.role);
/** Plain-language summary of each administrator's permissions, shown in the account menu. */
export const roleAbilities = {
  platform_admin: {
    guide: "platform",
    can: [
      "开通、更名、停用大区和学校",
      "为工作人员建账号，任命平台、大区、学校管理员",
      "重置任何账号的密码、停用账号，查看管理操作记录",
    ],
    cannot: "不查看学生的心情、关怀与支持需求",
  },
  region_admin: {
    guide: "region",
    can: [
      "查看本区所有学校的学生关怀、树洞审核和支持需求",
      "在本区建立工作人员账号，任命或撤销学校管理员",
      "查看各校邀请码的使用情况",
    ],
    cannot: "不能任命大区或平台管理员，看不到其他大区；邀请码由学校管理员生成",
  },
  school_admin: {
    guide: "school",
    can: [
      "生成本校学生邀请码，查看注册记录",
      "关注本校学生状态，审核树洞，回复支持需求",
      "为本校学生重置密码、停用账号，新建待授权工作人员",
    ],
    cannot: "不能任命管理员，看不到其他学校",
  },
};
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
