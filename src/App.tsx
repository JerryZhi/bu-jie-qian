import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { toBlob } from "html-to-image";
import PreviewEditor, { type PreviewEditorHandle } from "./PreviewEditor";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Battery,
  Check,
  ChevronDown,
  CircleHelp,
  FileImage,
  Info,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Settings2,
  Shuffle,
  Smartphone,
  Zap,
} from "lucide-react";
import {
  defaults,
  decodeConfig,
  estimate,
  HEIGHT,
  maturity,
  money,
  randomSuffix,
  STORAGE_KEY,
  TERMS,
  termLabel,
  validate,
  WIDTH,
  type Config,
} from "./domain";

function Section({
  number,
  title,
  subtitle,
  icon,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="config-section">
      <div className="section-heading">
        <span className="section-number">{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="section-icon">{icon}</span>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

// Scale the preview to available screen space; exported images keep their original size.
function fitPreviewScale() {
  const mobile = window.innerWidth <= 820;
  const availableWidth = mobile
    ? window.innerWidth - 60
    : (Math.min(window.innerWidth - 48, 1120) - 24) * 0.55 - 40;
  return Math.max(
    0.4,
    Math.min(
      mobile ? 0.78 : 0.9,
      availableWidth / 410,
      (window.innerHeight - (mobile ? 205 : 168)) / 864,
    ),
  );
}

export default function App() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? decodeConfig(raw) : null;
      return {
        config: saved ?? defaults(),
        message: saved
          ? "已恢复上次配置"
          : raw
            ? "旧配置无法读取，已载入默认值"
            : "参数仅保存在本机",
        blocked: false,
      };
    } catch {
      return {
        config: defaults(),
        message: "浏览器未允许本地保存",
        blocked: true,
      };
    }
  });
  const [config, setConfig] = useState(initial.config);
  const [storageMessage, setStorageMessage] = useState(initial.message);
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const [previewEditing, setPreviewEditing] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [previewScale, setPreviewScale] = useState(fitPreviewScale);
  useEffect(() => {
    const resize = () => setPreviewScale(fitPreviewScale());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const [showEditable, setShowEditable] = useState(false);
  const previewEditorRef = useRef<PreviewEditorHandle>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<HTMLDialogElement>(null);
  const hasEdited = useRef(false);
  const errors = validate(config);
  const valid = Object.keys(errors).length === 0;
  const values = estimate(config);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    hasEdited.current = true;
    setConfig((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (!hasEdited.current) return;
    if (!valid) {
      setStorageMessage("修正参数后自动保存");
      return;
    }
    setStorageMessage("正在保存…");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, config }),
        );
        setStorageMessage("配置已自动保存");
      } catch {
        setStorageMessage("无法保存，仍可预览和导出");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [config, valid]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (showReset) resetRef.current?.showModal();
    else resetRef.current?.close();
  }, [showReset]);

  function reset() {
    hasEdited.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
      setStorageMessage("本地配置已清空");
    } catch {
      setStorageMessage("已重置页面，浏览器未允许清除存储");
    }
    setConfig(defaults());
    setShowReset(false);
    setToast("已恢复默认参数");
  }

  async function exportPng() {
    if (!screenRef.current || !valid || exporting || previewEditing) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      // Let React remove preview editing affordances before cloning the screen.
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );
      const blob = await toBlob(screenRef.current, {
        width: WIDTH,
        height: HEIGHT,
        pixelRatio: config.scale,
        backgroundColor: "#ffffff",
        style: { borderRadius: "0" },
        fontEmbedCSS: "",
      });
      if (!blob) throw new Error("PNG is empty");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `拒绝借钱-模拟存款截图-${config.startDate}-${WIDTH * config.scale}x${HEIGHT * config.scale}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setToast("PNG 已生成，已发起下载");
    } catch (error) {
      console.error("PNG export failed:", error);
      setToast("导出失败，请重试或使用最新版 Chrome / Edge");
    } finally {
      setExporting(false);
    }
  }

  const inputProps = (key: keyof Config) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <>
      <header className="site-header">
        <a className="tool-title" href="./" aria-label="拒绝借钱截图工具首页">
          <FileImage size={27} aria-hidden="true" />
          <span>拒绝借钱截图工具</span>
        </a>
        <div className="header-right">
          <span className="local-badge">
            <LockKeyhole size={13} /> 本地工具 <i />
          </span>
          <span className="project-kind">免费 · 个人整活</span>
        </div>
      </header>
      <main className="workspace">
        <div className="editor-grid">
          <div className="editor-sidebar">
            <div className="intro">
              <h1>
                钱存定期了，
                <br />
                <span>这次真借不了。</span>
              </h1>
              <p>改好画面，一键生成模拟截图。</p>
            </div>
            <div className="workspace-actions">
              <button
                className="advanced-button"
                disabled={
                  exporting || previewEditing || (!valid && showControls)
                }
                aria-expanded={showControls}
                aria-controls="all-parameters"
                title={!valid ? "请先修正标红参数" : undefined}
                onClick={() => setShowControls(!showControls)}
              >
                <Settings2 size={17} />
                {showControls ? "收起高级设置" : "高级设置"}
                <ChevronDown
                  size={15}
                  className={showControls ? "is-open" : ""}
                />
              </button>
              <button
                className="text-button"
                disabled={exporting || previewEditing}
                onClick={() => previewEditorRef.current?.edit("amount")}
              >
                修改金额
              </button>
              <button
                className="text-button"
                disabled={exporting || previewEditing}
                onClick={() => setShowReset(true)}
              >
                <RotateCcw size={13} />
                重置
              </button>
            </div>
            <div
              className="controls"
              id="all-parameters"
              hidden={!showControls}
            >
              <div className="panel-title">
                <div>
                  <Settings2 size={17} />
                  <h2>高级设置</h2>
                </div>
              </div>
              <fieldset
                disabled={exporting || previewEditing}
                className="editor-fields"
              >
                <Section
                  number="01"
                  title="存款设置"
                  subtitle="设置金额、利率与存款期限"
                  icon={<FileImage size={19} />}
                >
                  <Field id="amount" label="存款金额" error={errors.amount}>
                    <div className="input-shell amount-input">
                      <span>¥</span>
                      <input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        value={config.amount}
                        onChange={(event) =>
                          update("amount", event.target.value)
                        }
                        {...inputProps("amount")}
                      />
                      <span>元</span>
                    </div>
                  </Field>
                  <div className="field-row">
                    <Field id="rate" label="年利率" error={errors.rate}>
                      <div className="input-shell">
                        <input
                          id="rate"
                          type="text"
                          inputMode="decimal"
                          value={config.rate}
                          onChange={(event) =>
                            update("rate", event.target.value)
                          }
                          {...inputProps("rate")}
                        />
                        <span>%</span>
                      </div>
                    </Field>
                    <Field id="months" label="存款期限">
                      <div className="select-shell">
                        <select
                          id="months"
                          value={config.months}
                          disabled={config.customEnd}
                          onChange={(event) =>
                            update("months", Number(event.target.value))
                          }
                        >
                          {TERMS.map((months) => (
                            <option key={months} value={months}>
                              {termLabel(months)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </Field>
                  </div>
                  <div className="field-row">
                    <Field
                      id="startDate"
                      label="存入日期"
                      error={errors.startDate}
                    >
                      <input
                        id="startDate"
                        type="date"
                        min="1900-01-01"
                        max="2199-12-31"
                        value={config.startDate}
                        onChange={(event) =>
                          update("startDate", event.target.value)
                        }
                        {...inputProps("startDate")}
                      />
                    </Field>
                    <Field id="endDate" label="到期日期" error={errors.endDate}>
                      <input
                        id="endDate"
                        type="date"
                        min={config.startDate || "1900-01-01"}
                        max="2199-12-31"
                        value={maturity(config)}
                        readOnly={!config.customEnd}
                        onChange={(event) =>
                          update("endDate", event.target.value)
                        }
                        {...inputProps("endDate")}
                      />
                    </Field>
                  </div>
                  <div className="switch-line">
                    <label htmlFor="customEnd">
                      手动设置到期日期
                      <span>
                        {config.customEnd
                          ? "按实际天数 / 365 估算收益"
                          : "默认根据存期自动计算"}
                      </span>
                    </label>
                    <Toggle
                      id="customEnd"
                      checked={config.customEnd}
                      label="手动设置到期日期"
                      onChange={(value) => {
                        if (value) update("endDate", maturity(config));
                        update("customEnd", value);
                      }}
                    />
                  </div>
                  <div className="field-row">
                    <Field
                      id="cardSuffix"
                      label="卡号尾号"
                      error={errors.cardSuffix}
                    >
                      <input
                        id="cardSuffix"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        value={config.cardSuffix}
                        onChange={(event) =>
                          update("cardSuffix", event.target.value)
                        }
                        {...inputProps("cardSuffix")}
                      />
                    </Field>
                    <Field
                      id="accountSuffix"
                      label="账户尾号"
                      error={errors.accountSuffix}
                    >
                      <input
                        id="accountSuffix"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        value={config.accountSuffix}
                        onChange={(event) =>
                          update("accountSuffix", event.target.value)
                        }
                        {...inputProps("accountSuffix")}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="text-button random-suffix-button"
                    onClick={() => {
                      update("cardSuffix", randomSuffix());
                      update("accountSuffix", randomSuffix());
                    }}
                  >
                    <Shuffle size={13} /> 随机生成两个尾号
                  </button>
                  <div className="estimate-box">
                    <div>
                      <span>
                        预计到期利息
                        <Info size={12} />
                      </span>
                      <strong>
                        {values ? `¥ ${money(values.interest)}` : "—"}
                      </strong>
                    </div>
                    <p>
                      {config.customEnd
                        ? "本金 × 年利率 × 实际天数 ÷ 365"
                        : "本金 × 年利率 × 存款月数 ÷ 12"}{" "}
                      · 单利估算
                    </p>
                  </div>
                </Section>
                <Section
                  number="02"
                  title="手机状态"
                  subtitle="细节，也可以刚刚好"
                  icon={<Smartphone size={19} />}
                >
                  <div className="field-row">
                    <Field id="time" label="手机时间" error={errors.time}>
                      <input
                        id="time"
                        type="time"
                        value={config.time}
                        onChange={(event) => update("time", event.target.value)}
                        {...inputProps("time")}
                      />
                    </Field>
                    <Field id="network" label="网络类型">
                      <div className="select-shell">
                        <select
                          id="network"
                          value={config.network}
                          onChange={(event) =>
                            update(
                              "network",
                              event.target.value as Config["network"],
                            )
                          }
                        >
                          <option value="wifi">Wi-Fi</option>
                          <option value="5G">5G</option>
                          <option value="4G">4G</option>
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </Field>
                  </div>
                  <Field id="battery" label="电池电量" error={errors.battery}>
                    <div className="battery-controls">
                      <Battery size={19} />
                      <input
                        aria-label="电量滑块"
                        type="range"
                        min="0"
                        max="100"
                        value={errors.battery ? 0 : Number(config.battery)}
                        onChange={(event) =>
                          update("battery", event.target.value)
                        }
                      />
                      <div className="input-shell">
                        <input
                          id="battery"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={config.battery}
                          onChange={(event) =>
                            update("battery", event.target.value)
                          }
                          {...inputProps("battery")}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </Field>
                  <div className="field-row device-bottom">
                    <div className="signal-setting">
                      <label htmlFor="signal">信号强度</label>
                      <select
                        id="signal"
                        value={config.signal}
                        onChange={(event) =>
                          update("signal", Number(event.target.value))
                        }
                      >
                        {[4, 3, 2, 1, 0].map((n) => (
                          <option key={n} value={n}>
                            {n === 0 ? "无信号" : `${n} 格信号`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="charging-switch">
                      <label htmlFor="charging">
                        <Zap size={14} />
                        充电状态
                      </label>
                      <Toggle
                        id="charging"
                        label="充电状态"
                        checked={config.charging}
                        onChange={(value) => update("charging", value)}
                      />
                    </div>
                  </div>
                </Section>
                <Section
                  number="03"
                  title="导出设置"
                  subtitle="为每一个像素保留清晰度"
                  icon={<ArrowDownToLine size={19} />}
                >
                  <div
                    className="resolution-options"
                    role="group"
                    aria-label="导出清晰度"
                  >
                    {([1, 2, 3] as const).map((scale) => (
                      <button
                        key={scale}
                        className={config.scale === scale ? "selected" : ""}
                        aria-pressed={config.scale === scale}
                        onClick={() => update("scale", scale)}
                      >
                        <strong>
                          {scale}×{" "}
                          <span>
                            {scale === 1
                              ? "标准"
                              : scale === 2
                                ? "高清"
                                : "超清"}
                          </span>
                        </strong>
                        <small>
                          {WIDTH * scale} × {HEIGHT * scale}
                        </small>
                        {config.scale === scale && (
                          <span className="resolution-check">
                            <Check size={9} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="export-note">
                    <Info size={13} />
                    导出仅包含手机画面，不包含网站提示。
                  </p>
                  <div className="switch-line">
                    <label htmlFor="cropFooter">
                      底部文字半截显示<span>模拟页面超出屏幕边界</span>
                    </label>
                    <Toggle
                      id="cropFooter"
                      label="底部文字半截显示"
                      checked={config.cropFooter}
                      onChange={(value) => update("cropFooter", value)}
                    />
                  </div>
                </Section>
              </fieldset>
            </div>
            <fieldset
              className="quick-settings"
              disabled={exporting || previewEditing}
            >
              <div>
                <label htmlFor="hotspot">热点提示</label>
                <small>
                  {config.showHotspot
                    ? "正在连接 1 台设备"
                    : "已关闭 · 顶部中间留白"}
                </small>
              </div>
              <Toggle
                id="hotspot"
                label="热点提示"
                checked={config.showHotspot}
                onChange={(value) => update("showHotspot", value)}
              />
            </fieldset>
            <div className="export-footer">
              <div>
                <FileImage size={21} />
                <div>
                  <label className="export-scale-label" htmlFor="exportScale">
                    PNG 清晰度
                  </label>
                  <select
                    id="exportScale"
                    value={config.scale}
                    disabled={exporting || previewEditing}
                    onChange={(event) =>
                      update(
                        "scale",
                        Number(event.target.value) as Config["scale"],
                      )
                    }
                  >
                    <option value={1}>1× 标准</option>
                    <option value={2}>2× 高清</option>
                    <option value={3}>3× 超清</option>
                  </select>
                  <small>
                    {WIDTH * config.scale} × {HEIGHT * config.scale} px ·{" "}
                    {config.scale} 倍清晰度
                  </small>
                </div>
              </div>
              <button
                className="export-button"
                onClick={exportPng}
                disabled={!valid || exporting || previewEditing}
                title={
                  previewEditing ? "请先保存或取消预览中的修改" : undefined
                }
              >
                {exporting ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <ArrowDownToLine size={16} />
                )}
                {exporting ? "正在生成" : "导出 PNG"}
                {!exporting && <ArrowUpRight size={14} />}
              </button>
            </div>
            <div className="storage-status" role="status">
              <span
                className={
                  valid && !initial.blocked ? "saved-dot" : "unsaved-dot"
                }
              />
              {storageMessage}
              <LockKeyhole size={12} />
            </div>
            {!valid && (
              <p className="export-error" role="alert">
                请先修正参数表单中标红的内容，再导出图片。
              </p>
            )}
            <div className="preview-disclaimer">
              <CircleHelp size={15} />
              <div>
                <p>
                  <strong>模拟图片 · 非银行凭证</strong>
                  <br />
                  仅供朋友间玩笑、婉拒借钱等非正式聊天，不能证明真实存款或资产。
                </p>
                <details className="usage-disclaimer">
                  <summary>使用须知与免责声明</summary>
                  <p>
                    这是免费、无商业化计划的个人整活工具，不连接银行，与金融机构无关联。图片中的数据由你填写或模拟生成。
                  </p>
                  <p>
                    不得冒充真实凭证，用于骗取钱款、授信、交易担保、资产审核或其他违法、侵权行为。请对自己填写、传播和使用图片的行为负责，作者不为这些行为背书，也不参与相关借贷或交易。
                  </p>
                  <p>
                    工具按现状提供。在适用法律允许的范围内，作者及贡献者不对使用、误用或传播工具及图片造成的损失承担责任；依法不能免除或限制的责任除外。
                  </p>
                  <p>
                    参数和图片在浏览器内处理；访问站点仍会产生常规网络请求。无需填写真实银行卡号或他人敏感信息。
                  </p>
                  <a
                    href="https://github.com/JerryZhi/bu-jie-qian/blob/main/DISCLAIMER.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    阅读完整免责声明 ↗
                  </a>
                </details>
              </div>
            </div>
          </div>
          <aside className="preview-column" aria-label="手机预览">
            <div className="preview-panel">
              <div className="preview-toolbar">
                <span>
                  <i />
                  <span className="desktop-instruction">
                    双击修改 · 红条可拖动
                  </span>
                  <span className="touch-instruction">
                    点按修改 · 红条可拖动
                  </span>
                </span>
                <button
                  className="text-button"
                  aria-pressed={showEditable}
                  disabled={exporting}
                  onClick={() => setShowEditable(!showEditable)}
                >
                  {showEditable ? "隐藏编辑标记" : "标出可编辑项"}
                </button>
              </div>
              <div
                className="preview-stage"
                style={{ "--phone-scale": previewScale } as CSSProperties}
              >
                <div className="phone-container">
                  <div
                    className={`phone-frame ${showEditable ? "show-editable" : ""}`}
                  >
                    <PreviewEditor
                      ref={previewEditorRef}
                      config={config}
                      screenRef={screenRef}
                      disabled={exporting}
                      onEditingChange={setPreviewEditing}
                      onChange={(patch) => {
                        hasEdited.current = true;
                        setConfig((current) => ({ ...current, ...patch }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
        <footer className="site-footer">
          <span>
            个人整活 <span>·</span> 免费使用，没有商业化计划。
          </span>
          <span>
            <a
              href="https://github.com/JerryZhi/bu-jie-qian"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看源码
            </a>
            <span>·</span>
            <a
              href="https://github.com/JerryZhi/bu-jie-qian/blob/main/DISCLAIMER.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              免责声明
            </a>
          </span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Info size={16} />
          {toast}
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
      <dialog
        ref={resetRef}
        className="reset-dialog"
        onCancel={() => setShowReset(false)}
        onClose={() => setShowReset(false)}
      >
        <div className="dialog-icon">
          <RotateCcw size={22} />
        </div>
        <h2>恢复默认参数？</h2>
        <p>当前参数和本机保存的配置将被清空。已导出的图片不受影响。</p>
        <div>
          <button
            className="secondary-button"
            onClick={() => setShowReset(false)}
          >
            继续编辑
          </button>
          <button className="export-button" onClick={reset}>
            清空并重置
          </button>
        </div>
      </dialog>
    </>
  );
}
