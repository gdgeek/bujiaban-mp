/** Web login uses target-specific credentials, independently of the check-in login. */
export interface AdminLoginTicket {
  readonly id: string;
  readonly secret: string;
  readonly origin: string;
}

const DEFAULT_ORIGINS = [
  "https://checkin.voxel.cn",
  "https://x.b0.01xr.com",
  "https://x.b1.01xr.com",
  "https://x.4mr.cn",
];
const INVALID_QR = "无效的管理后台登录二维码，请刷新后重试";
let pendingTicket: AdminLoginTicket | null = null;

// Avoid URL/URLSearchParams: they are not available in every WeChat JS runtime.
function isCanonicalOrigin(value: string): boolean {
  const match =
    /^https:\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)(?::([1-9][0-9]{0,4}))?$/.exec(
      value,
    );
  return (
    !!match &&
    match[0] === value &&
    (!match[2] || (Number(match[2]) <= 65535 && match[2] !== "443"))
  );
}

export function getTrustedAdminLoginOrigins(): readonly string[] {
  const configured = import.meta.env.VITE_ADMIN_LOGIN_ORIGINS;
  const values = typeof configured === "string" ? configured.split(",") : DEFAULT_ORIGINS;
  return [...new Set(values.map((value) => value.trim()).filter(isCanonicalOrigin))];
}

function validateTicket(ticket: AdminLoginTicket): void {
  if (
    !ticket ||
    !/^[a-f0-9]{32}$/.test(ticket.id) ||
    !/^[a-f0-9]{64}$/.test(ticket.secret) ||
    ticket.id.length !== 32 ||
    ticket.secret.length !== 64
  ) {
    throw new Error(INVALID_QR);
  }
  if (!isCanonicalOrigin(ticket.origin) || !getTrustedAdminLoginOrigins().includes(ticket.origin)) {
    throw new Error("二维码指向不受信任的管理后台");
  }
}

export function parseAdminLoginQr(value: string): AdminLoginTicket {
  if (typeof value !== "string") throw new Error(INVALID_QR);
  const match = /^bujiaban-admin-login:\/\/v1\/([a-f0-9]{32})\?(.+)$/.exec(value);
  if (!match || match[0] !== value) throw new Error(INVALID_QR);
  const fields = match[2].split("&");
  if (fields.length !== 2) throw new Error(INVALID_QR);
  const params: Record<string, string> = {};
  for (const field of fields) {
    const parts = field.split("=");
    if (parts.length !== 2 || !["secret", "origin"].includes(parts[0]) || parts[0] in params) {
      throw new Error(INVALID_QR);
    }
    params[parts[0]] = parts[1];
  }
  let origin: string;
  try {
    origin = decodeURIComponent(params.origin);
  } catch {
    throw new Error(INVALID_QR);
  }
  if (encodeURIComponent(origin) !== params.origin) throw new Error(INVALID_QR);
  const ticket = { id: match[1], secret: params.secret, origin };
  validateTicket(ticket);
  return ticket;
}

/** Transfer the secret once, without putting it in navigation URLs or storage. */
export function takePendingAdminLogin(): AdminLoginTicket | null {
  const ticket = pendingTicket;
  pendingTicket = null;
  return ticket;
}

export function beginAdminLoginScan(): Promise<boolean> {
  pendingTicket = null;
  return new Promise((resolve, reject) => {
    uni.scanCode({
      scanType: ["qrCode"],
      success: (result) => {
        try {
          pendingTicket = parseAdminLoginQr(result.result);
        } catch (error) {
          reject(error);
          return;
        }
        uni.navigateTo({
          url: "/pages/auth/confirm",
          success: () => resolve(true),
          fail: () => {
            pendingTicket = null;
            reject(new Error("无法打开确认页，请重新扫码"));
          },
        });
      },
      fail: (error) => {
        if (error.errMsg?.includes("cancel")) resolve(false);
        else reject(new Error("扫码失败，请重试"));
      },
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeMessage(body: unknown, fallback: string, sensitive: readonly string[]): string {
  const message = isRecord(body) ? body.message : undefined;
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 160 ||
    /[<>]/.test(message) ||
    [...message].some((character) => character.charCodeAt(0) < 32) ||
    sensitive.some((value) => value && message.includes(value))
  ) {
    return fallback;
  }
  return message.trim();
}

function targetPost(
  url: string,
  data: Record<string, string>,
  fallback: string,
  sensitive: readonly string[],
  bearer?: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    // Do not use request.ts: it automatically attaches the current environment's Bearer.
    wx.request({
      url,
      method: "POST",
      timeout: 15000,
      header: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      data,
      success: (response) => {
        const body: unknown = response.data;
        if (
          response.statusCode < 200 ||
          response.statusCode >= 300 ||
          !isRecord(body) ||
          body.success !== true
        ) {
          reject(new Error(safeMessage(body, fallback, sensitive)));
          return;
        }
        resolve(body);
      },
      fail: () => reject(new Error("网络请求失败，请稍后重试")),
    });
  });
}

function freshWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      timeout: 15000,
      success: (result) => {
        if (result.code) resolve(result.code);
        else reject(new Error("微信登录失败，请重试"));
      },
      fail: () => reject(new Error("微信登录失败，请重试")),
    });
  });
}

/** Call only after the user explicitly confirms the displayed backend. */
export async function approveAdminLogin(
  ticket: AdminLoginTicket,
  isCancelled: () => boolean = () => false,
): Promise<void> {
  validateTicket(ticket);
  const apiBase = `${ticket.origin}${
    ticket.origin === "https://checkin.voxel.cn" ? "/api/v2" : "/v2"
  }`;
  const checkActive = () => {
    if (isCancelled()) throw new Error("已取消登录");
  };
  checkActive();
  const code = await freshWechatCode();
  checkActive();
  const login = await targetPost(`${apiBase}/site/login`, { code }, "目标后端登录失败，请重试", [
    ticket.secret,
    code,
  ]);
  checkActive();
  const data = login.data;
  const token = isRecord(data) && isRecord(data.token) ? data.token.accessToken : undefined;
  if (typeof token !== "string" || !/^[A-Za-z0-9._~-]{1,8192}$/.test(token)) {
    throw new Error("目标后端登录失败，请重试");
  }
  const approval = await targetPost(
    `${apiBase}/web-login/tickets/${ticket.id}/approve`,
    { secret: ticket.secret },
    "确认登录失败，请刷新二维码后重试",
    [ticket.secret, token, code],
    token,
  );
  if (!isRecord(approval.data) || approval.data.status !== "approved") {
    throw new Error("确认登录失败，请刷新二维码后重试");
  }
}
