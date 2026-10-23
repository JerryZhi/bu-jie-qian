import type { RefObject } from "react";
import {
  ChevronLeft,
  Headset,
  Info,
  Link2,
  MoreHorizontal,
  Wifi,
  Zap,
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

function Signal({ count }: { count: number }) {
  return (
    <span className="signal" aria-label={`${count} 格信号`}>
      {[1, 2, 3, 4].map((n) => (
        <i
          key={n}
          style={{ height: 4 + n * 2, opacity: n <= count ? 1 : 0.2 }}
        />
      ))}
    </span>
  );
}

export default function PhoneScreen({
  config,
  screenRef,
}: {
  config: Config;
  screenRef: RefObject<HTMLDivElement | null>;
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
        <strong>{errors.time ? "--:--" : config.time}</strong>
        <span className="status-island" aria-hidden="true">
          <Link2 size={22} />
          <span>1台</span>
        </span>
        <div className="status-indicators">
          <Signal count={config.signal} />
          {config.network === "wifi" ? (
            <Wifi size={16} strokeWidth={2.5} />
          ) : (
            <b className="network-text">{config.network}</b>
          )}
          <span
            className={`phone-battery ${config.charging ? "charging" : battery <= 20 ? "low" : ""}`}
          >
            <span style={{ width: `${battery}%` }} />
            <b>
              {config.charging ? (
                <Zap size={11} fill="currentColor" />
              ) : errors.battery ? (
                "–"
              ) : (
                battery
              )}
            </b>
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
          <span data-testid="preview-amount">{amount}</span>
          <span>元</span>
        </div>
        <div className="interest-summary">
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
            <dd>个人人民币{term}期整存整取存款</dd>
          </div>
          <div>
            <dt>存期</dt>
            <dd>{term}</dd>
          </div>
          <div>
            <dt>当前执行年利率</dt>
            <dd data-testid="preview-rate">
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
            <dd className="placeholder-account" data-testid="preview-card">
              6212****{errors.cardSuffix ? "—" : config.cardSuffix}
            </dd>
          </div>
          <div>
            <dt>账户</dt>
            <dd className="placeholder-account" data-testid="preview-account">
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
            <dd>{startLabel}</dd>
          </div>
          <div>
            <dt>到期日</dt>
            <dd data-testid="preview-end">{endLabel}</dd>
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
              <span>{startLabel.replaceAll("-", ".")}</span>
            </div>
            <div>
              <strong>到期日</strong>
              <span>{endLabel.replaceAll("-", ".")}</span>
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
      <div className={`phone-footer${config.cropFooter ? " is-cropped" : ""}`}>
        <div className="footer-text-viewport">
          <p>本金和利息到期后自动转入活期</p>
        </div>
      </div>
      <div className="home-indicator" />
    </div>
  );
}
