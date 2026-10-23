export const STORAGE_KEY = "deposit-studio:v1";
export const WIDTH = 390;
export const HEIGHT = 844;
export const TERMS = [3, 6, 12, 24, 36, 60] as const;

export interface Config {
  amount: string;
  rate: string;
  months: number;
  startDate: string;
  customEnd: boolean;
  endDate: string;
  time: string;
  battery: string;
  charging: boolean;
  network: "wifi" | "5G" | "4G";
  signal: number;
  scale: 1 | 2 | 3;
  cropFooter: boolean;
  cardSuffix: string;
  accountSuffix: string;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2199) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function addMonths(value: string, months: number): string {
  const date = parseDate(value);
  if (!date) return "";
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      Math.min(date.getUTCDate(), lastDay),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function randomSuffix(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function defaults(now = new Date()): Config {
  const openedAt = new Date(now);
  openedAt.setDate(openedAt.getDate() - 16);
  const startDate = localDate(openedAt);
  return {
    amount: "200000",
    rate: "2.65",
    months: 36,
    startDate,
    customEnd: false,
    endDate: addMonths(startDate, 36),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    battery: "86",
    charging: false,
    network: "wifi",
    signal: 4,
    scale: 3,
    cropFooter: true,
    cardSuffix: randomSuffix(),
    accountSuffix: randomSuffix(),
  };
}

export function maturity(config: Config): string {
  return config.customEnd
    ? config.endDate
    : addMonths(config.startDate, config.months);
}

export function validate(
  config: Config,
): Partial<Record<keyof Config, string>> {
  const errors: Partial<Record<keyof Config, string>> = {};
  if (
    !/^\d+(\.\d{1,2})?$/.test(config.amount) ||
    Number(config.amount) <= 0 ||
    Number(config.amount) > 999999999.99
  )
    errors.amount = "请输入 0.01–999,999,999.99 元，最多两位小数";
  if (!/^\d+(\.\d{1,3})?$/.test(config.rate) || Number(config.rate) > 20)
    errors.rate = "请输入 0–20 的年利率，最多三位小数";
  if (!(TERMS as readonly number[]).includes(config.months))
    errors.months = "请选择有效存期";
  if (!parseDate(config.startDate))
    errors.startDate = "请选择有效的存入日期（1900–2199 年）";
  const end = maturity(config);
  if (!parseDate(end)) errors.endDate = "请选择有效的到期日期（1900–2199 年）";
  else if (parseDate(config.startDate) && end <= config.startDate)
    errors.endDate = "到期日期必须晚于存入日期";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.time))
    errors.time = "请输入有效的 24 小时时间";
  if (!/^\d{1,3}$/.test(config.battery) || Number(config.battery) > 100)
    errors.battery = "电量需为 0–100 的整数";
  if (!["wifi", "5G", "4G"].includes(config.network))
    errors.network = "请选择有效的网络";
  if (![0, 1, 2, 3, 4].includes(config.signal))
    errors.signal = "信号需为 0–4 格";
  if (![1, 2, 3].includes(config.scale)) errors.scale = "请选择有效的导出倍率";
  if (!/^[0-9]{4}$/.test(config.cardSuffix))
    errors.cardSuffix = "请输入 4 位数字尾号";
  if (!/^[0-9]{4}$/.test(config.accountSuffix))
    errors.accountSuffix = "请输入 4 位数字尾号";
  return errors;
}

export function estimate(
  config: Config,
): { interest: number; total: number; days: number } | null {
  const errors = validate(config);
  if (
    errors.amount ||
    errors.rate ||
    errors.startDate ||
    errors.endDate ||
    errors.months
  )
    return null;
  const days =
    (parseDate(maturity(config))!.getTime() -
      parseDate(config.startDate)!.getTime()) /
    86400000;
  const years = config.customEnd ? days / 365 : config.months / 12;
  const principalCents = Math.round(Number(config.amount) * 100);
  const interestCents = Math.round(
    ((principalCents * Number(config.rate)) / 100) * years,
  );
  return {
    interest: interestCents / 100,
    total: (principalCents + interestCents) / 100,
    days,
  };
}

export function depositStatus(config: Config, today = localDate()): string {
  if (
    !parseDate(config.startDate) ||
    !parseDate(maturity(config)) ||
    maturity(config) <= config.startDate
  )
    return "待完善";
  if (config.startDate > today) return "未起息";
  return maturity(config) <= today ? "已到期" : "存续中";
}

export function termLabel(months: number): string {
  return months >= 12 ? `${months / 12} 年` : `${months} 个月`;
}

export function money(value: number): string {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function decodeConfig(raw: string): Config | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("config" in parsed)
    )
      return null;
    const candidate = parsed.config;
    if (!candidate || typeof candidate !== "object") return null;
    const result = defaults();
    for (const key of Object.keys(result) as (keyof Config)[]) {
      // Preserve existing v1 settings when loading configurations saved before this option existed.
      if (
        ["cropFooter", "cardSuffix", "accountSuffix"].includes(key) &&
        !(key in candidate)
      )
        continue;
      if (
        !(key in candidate) ||
        typeof candidate[key as keyof typeof candidate] !== typeof result[key]
      )
        return null;
      Object.assign(result, {
        [key]: candidate[key as keyof typeof candidate],
      });
    }
    return Object.keys(validate(result)).length === 0 ? result : null;
  } catch {
    return null;
  }
}
