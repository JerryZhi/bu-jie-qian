import type { RefObject } from "react";
import type { PreviewEditProps, PreviewField } from "./PreviewEditor";
import {
  ChevronLeft,
  Headset,
  Info,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import {
  estimate,
  localDate,
  maturity,
  money,
  parseDate,
  termLabel,
  validate,
  type Config,
} from "./domain";
import "./phone.css";

function Signal({
  count,
  network,
}: {
  count: number;
  network: Config["network"];
}) {
  return (
    <span
      className="cellular-status"
      aria-label={`${network === "wifi" ? "蜂窝" : network}，${count} 格信号`}
    >
      {network !== "wifi" && (
        <b className="network-text" aria-hidden="true">
          {network}
        </b>
      )}
      <span className="signal" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i
            key={n}
            style={{ height: 3 + n * 2.5, opacity: n <= count ? 1 : 0.2 }}
          />
        ))}
      </span>
    </span>
  );
}

export default function PhoneScreen({
  config,
  screenRef,
  editProps = () => ({}),
}: {
  config: Config;
  screenRef: RefObject<HTMLDivElement | null>;
  editProps?: (field: PreviewField) => PreviewEditProps;
}) {
  const errors = validate(config);
  const values = estimate(config);
  const battery = errors.battery ? 0 : Number(config.battery);
  const amount = errors.amount ? "—" : money(Number(config.amount));
  const end = maturity(config);
  const term = config.customEnd
    ? values
      ? `${values.days}天`
      : "—"
    : termLabel(config.months).replaceAll(" ", "");
  const startLabel = errors.startDate ? "—" : config.startDate;
  const endLabel = errors.endDate ? "—" : end;
  const startTime = parseDate(config.startDate)?.getTime();
  const endTime = parseDate(end)?.getTime();
  const todayTime = parseDate(localDate())!.getTime();
  const progress =
    startTime !== undefined && endTime !== undefined && endTime > startTime
      ? Math.max(
          0,
          Math.min(
            100,
            ((todayTime - startTime) / (endTime - startTime)) * 100,
          ),
        )
      : 0;

  return (
    <div className="phone-screen" ref={screenRef} data-testid="phone-screen">
      <div className="status-bar">
        <strong {...editProps("time")}>
          {errors.time ? "--:--" : config.time}
        </strong>
        <span className="status-island" aria-hidden="true">
          <Link2 size={22} />
          <span>1台</span>
        </span>
        <div className="status-indicators">
          <span className="connection-status" {...editProps("connection")}>
            <Signal count={config.signal} network={config.network} />
            {config.network === "wifi" && (
              <svg
                className="status-wifi"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-label="Wi-Fi"
              >
                <path
                  d="M1.5 5.5a9.2 9.2 0 0 1 13 0M4 8a5.65 5.65 0 0 1 8 0M6.5 10.5a2.12 2.12 0 0 1 3 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="13" r="1" fill="currentColor" />
              </svg>
            )}
          </span>
          <span
            className={`battery-status ${config.charging ? "charging" : battery <= 20 ? "low" : ""}`}
            aria-label={`电量 ${errors.battery ? "未知" : `${battery}%`}${config.charging ? "，充电中" : ""}`}
            {...editProps("battery")}
          >
            <svg
              className="phone-battery"
              width="28"
              height="16"
              viewBox="0 0 28 16"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="0.75"
                y="2.75"
                width="24.5"
                height="10.5"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="26"
                y="6"
                width="2"
                height="4"
                rx="0.75"
                fill="currentColor"
              />
              <rect
                className="battery-fill"
                x="2.5"
                y="4.5"
                width={(21 * battery) / 100}
                height="7"
                rx="0.5"
                fill={
                  config.charging
                    ? "#51a66e"
                    : battery <= 20
                      ? "#cc3434"
                      : "#444"
                }
              />
              {config.charging && (
                <path
                  className="charging-bolt"
                  d="M14 4 10 8.5h3l-1 3.5 5-5.5h-3z"
                  fill="#137c3a"
                  stroke="#fff"
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            <span className="battery-percentage">
              {errors.battery ? "–" : `${battery}%`}
            </span>
          </span>
        </div>
      </div>
      <div className="phone-nav">
        <ChevronLeft size={26} strokeWidth={1.5} />
        <span>我的定期存款</span>
        <div>
          <Headset size={23} strokeWidth={1.7} />
          <MoreHorizontal size={25} />
        </div>
      </div>
      <div className="phone-section-gap first-gap" />
      <section className="balance-summary" aria-label="存单余额">
        <p className="balance-label">当前存单余额（元）</p>
        <div className={`balance-value ${amount.length > 12 ? "compact" : ""}`}>
          <span className="currency-symbol">¥</span>
          <span data-testid="preview-amount" {...editProps("amount")}>
            {amount}
          </span>
          <span>元</span>
        </div>
        <div
          className="interest-summary"
          title="利息根据金额、年利率和存款期限自动计算"
        >
          <span>预计到期利息：</span>
          <strong>
            <span data-testid="preview-interest">
              {values ? money(values.interest) : "—"}
            </span>
            元
          </strong>
          <Info size={14} />
        </div>
        <div className="summary-bottom">
          <span className="alias-label" aria-hidden="true">
            设置别名
          </span>
        </div>
      </section>
      <div className="phone-section-gap" />
      <section className="account-details" aria-label="存款产品信息">
        <dl className="bank-rows">
          <div className="product-row">
            <dt>产品名称</dt>
            <dd {...editProps("months")}>个人人民币{term}期整存整取存款</dd>
          </div>
          <div>
            <dt>存期</dt>
            <dd {...editProps("months")}>{term}</dd>
          </div>
          <div>
            <dt>当前执行年利率</dt>
            <dd data-testid="preview-rate" {...editProps("rate")}>
              {errors.rate
                ? "—"
                : `${Number(config.rate).toFixed(Math.max(2, config.rate.split(".")[1]?.length ?? 0))}%`}
            </dd>
          </div>
          <div>
            <dt>币种</dt>
            <dd>人民币</dd>
          </div>
          <div>
            <dt>卡号</dt>
            <dd
              className="placeholder-account"
              data-testid="preview-card"
              {...editProps("cardSuffix")}
            >
              6212****{errors.cardSuffix ? "—" : config.cardSuffix}
            </dd>
          </div>
          <div>
            <dt>账户</dt>
            <dd
              className="placeholder-account"
              data-testid="preview-account"
              {...editProps("accountSuffix")}
            >
              3602****{errors.accountSuffix ? "—" : config.accountSuffix}
            </dd>
          </div>
        </dl>
        <div className="account-toggle-row">
          <span>查看完整交易卡号或账户</span>
          <span className="static-switch" aria-hidden="true">
            <i />
          </span>
        </div>
      </section>
      <div className="phone-section-gap" />
      <section className="date-details" aria-label="存款日期">
        <dl className="bank-rows">
          <div>
            <dt>开户日</dt>
            <dd {...editProps("startDate")}>{startLabel}</dd>
          </div>
          <div>
            <dt>到期日</dt>
            <dd data-testid="preview-end" {...editProps("endDate")}>
              {endLabel}
            </dd>
          </div>
        </dl>
        <div className="deposit-timeline">
          <div
            className="timeline-track"
            role="progressbar"
            aria-label="存款期限进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="timeline-labels">
            <div>
              <strong>起息日</strong>
              <span {...editProps("startDate")}>
                {startLabel.replaceAll("-", ".")}
              </span>
            </div>
            <div>
              <strong>到期日</strong>
              <span {...editProps("endDate")}>
                {endLabel.replaceAll("-", ".")}
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="phone-section-gap" />
      <section className="renewal-details" aria-label="到期处理">
        <dl className="bank-rows">
          <div>
            <dt>到期是否约转</dt>
            <dd>到期不约转</dd>
          </div>
        </dl>
      </section>
      <div
        className={`phone-footer${config.cropFooter ? " is-cropped" : ""}`}
        {...editProps("cropFooter")}
      >
        <div className="footer-text-viewport">
          <p>本金和利息到期后自动转入活期</p>
        </div>
      </div>
      <div className="home-indicator" />
    </div>
  );
}
