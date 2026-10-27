import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import PhoneScreen from "./PhoneScreen";
import { maturity, TERMS, termLabel, validate, type Config } from "./domain";
import "./preview-editor.css";

const labels = {
  amount: "存款金额",
  rate: "年利率",
  months: "存款期限",
  startDate: "存入日期",
  endDate: "到期日期",
  cardSuffix: "卡号尾号",
  accountSuffix: "账户尾号",
  time: "手机时间",
  connection: "网络与信号",
  battery: "电量与充电状态",
  cropFooter: "底部文字显示",
  showHotspot: "热点提示",
};
export type PreviewField = keyof typeof labels;
export type PreviewEditorHandle = { edit: (field: PreviewField) => void };
export type PreviewEditProps = HTMLAttributes<HTMLElement> & {
  "data-edit-field"?: PreviewField;
};
const desktopQuery = "(hover: hover) and (pointer: fine)";

export default function PreviewEditor({
  ref,
  config,
  screenRef,
  disabled,
  onChange,
  onEditingChange,
}: {
  ref?: Ref<PreviewEditorHandle>;
  config: Config;
  screenRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  onChange: (patch: Partial<Config>) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia(desktopQuery).matches,
  );
  const [active, setActive] = useState<{
    field: PreviewField;
    target: HTMLElement;
  } | null>(null);
  const [patch, setPatch] = useState<Partial<Config>>({});
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const editorRef = useRef<HTMLFormElement>(null);
  const draft = { ...config, ...patch };

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    function change() {
      setDesktop(media.matches);
      if (!media.matches) setActive(null);
    }
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    onEditingChange(active !== null);
  }, [active, onEditingChange]);

  useLayoutEffect(() => {
    if (!active) return;
    const control = editorRef.current?.querySelector<
      HTMLInputElement | HTMLSelectElement
    >("input, select");
    control?.focus({ preventScroll: true });
    if (control instanceof HTMLInputElement && control.type === "text")
      control.select();
  }, [active]);

  useLayoutEffect(() => {
    if (!active) return;
    function reposition() {
      if (!active || !editorRef.current) return;
      const anchor = active.target.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewTop = viewport?.offsetTop ?? 0;
      const viewLeft = viewport?.offsetLeft ?? 0;
      const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
      const viewRight = viewLeft + (viewport?.width ?? window.innerWidth);
      editorRef.current.style.maxHeight = `${viewBottom - viewTop - 24}px`;
      const box = editorRef.current.getBoundingClientRect();
      const top =
        anchor.bottom + 8 + box.height <= viewBottom - 12
          ? anchor.bottom + 8
          : anchor.top - box.height - 8;
      setPosition({
        left: Math.max(
          viewLeft + 12,
          Math.min(anchor.right - box.width, viewRight - box.width - 12),
        ),
        top: Math.max(
          viewTop + 12,
          Math.min(top, viewBottom - box.height - 12),
        ),
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };
  }, [active, error]);

  function close(restoreFocus = false) {
    if (restoreFocus) active?.target.focus({ preventScroll: true });
    setActive(null);
  }

  function save(restoreFocus = false) {
    const errors = validate(draft);
    // Date edits can invalidate the other end of the range or an automatic maturity.
    const keys = new Set<keyof Config>(Object.keys(patch) as (keyof Config)[]);
    if (
      ["startDate", "endDate", "months", "customEnd"].some(
        (key) => key in patch,
      )
    ) {
      keys.add("startDate");
      keys.add("endDate");
      keys.add("months");
    }
    const message = [...keys].map((key) => errors[key]).find(Boolean);
    if (message) {
      setError(message);
      return false;
    }
    onChange(patch);
    close(restoreFocus);
    return true;
  }

  useEffect(() => {
    if (!active) return;
    function outside(event: PointerEvent) {
      if (
        !(event.target instanceof Node) ||
        editorRef.current?.contains(event.target)
      )
        return;
      if (!save()) {
        event.preventDefault();
        editorRef.current
          ?.querySelector<HTMLInputElement | HTMLSelectElement>("input, select")
          ?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  function open(field: PreviewField, target: HTMLElement) {
    if (disabled) return;
    if (active && !save()) return;
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    const initialPatch: Partial<Config> =
      field === "endDate"
        ? { endDate: maturity(config), customEnd: true }
        : field === "months"
          ? { months: config.months, customEnd: false }
          : field === "connection"
            ? { network: config.network, signal: config.signal }
            : field === "battery"
              ? { battery: config.battery, charging: config.charging }
              : { [field]: config[field] };
    setPatch(initialPatch);
    setError("");
    setActive({ field, target });
    window.getSelection()?.removeAllRanges();
  }

  useImperativeHandle(ref, () => ({
    edit(field) {
      const target = screenRef.current?.querySelector<HTMLElement>(
        `[data-edit-field="${field}"]`,
      );
      if (target) open(field, target);
    },
  }));

  function editProps(field: PreviewField): PreviewEditProps {
    if (disabled) return {};
    return {
      "data-edit-field": field,
      title: `${desktop ? "双击" : "点按"}修改${labels[field]}`,
      tabIndex: 0,
      role: "button",
      "aria-label": `修改${labels[field]}`,
      "aria-haspopup": "dialog",
      onDoubleClick: desktop
        ? (event) => open(field, event.currentTarget)
        : undefined,
      onClick: desktop
        ? undefined
        : (event) => open(field, event.currentTarget),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(field, event.currentTarget);
        }
      },
    };
  }

  function change<K extends keyof Config>(key: K, value: Config[K]) {
    setPatch((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function input(
    key:
      | "amount"
      | "rate"
      | "startDate"
      | "endDate"
      | "time"
      | "cardSuffix"
      | "accountSuffix"
      | "battery",
    label: string,
  ) {
    const date = key === "startDate" || key === "endDate";
    const suffix = key === "cardSuffix" || key === "accountSuffix";
    return (
      <label className="preview-editor-field">
        <span>{label}</span>
        <input
          type={date ? "date" : key === "time" ? "time" : "text"}
          inputMode={
            suffix || key === "battery"
              ? "numeric"
              : key === "amount" || key === "rate"
                ? "decimal"
                : undefined
          }
          min={date ? "1900-01-01" : undefined}
          max={date ? "2199-12-31" : undefined}
          maxLength={suffix ? 4 : undefined}
          autoComplete="off"
          value={draft[key]}
          aria-invalid={!!error}
          aria-describedby={error ? "preview-edit-error" : undefined}
          onChange={(event) => change(key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <>
      <PhoneScreen
        config={config}
        screenRef={screenRef}
        editProps={editProps}
      />
      {active &&
        createPortal(
          <form
            ref={editorRef}
            className="preview-editor"
            style={position}
            role="dialog"
            aria-label={`修改${labels[active.field]}`}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close(true);
              }
              if (event.key === "Enter" && event.nativeEvent.isComposing)
                event.preventDefault();
            }}
          >
            <div className="preview-editor-heading">
              <strong>{labels[active.field]}</strong>
              <span>{desktop ? "双击编辑" : "点按编辑"}</span>
            </div>
            {active.field === "connection" ? (
              <>
                <label className="preview-editor-field">
                  <span>网络类型</span>
                  <select
                    value={draft.network}
                    onChange={(event) =>
                      change("network", event.target.value as Config["network"])
                    }
                  >
                    <option value="wifi">Wi-Fi</option>
                    <option value="5G">5G</option>
                    <option value="4G">4G</option>
                  </select>
                </label>
                <label className="preview-editor-field">
                  <span>信号强度</span>
                  <select
                    value={draft.signal}
                    onChange={(event) =>
                      change("signal", Number(event.target.value))
                    }
                  >
                    {[4, 3, 2, 1, 0].map((n) => (
                      <option value={n} key={n}>
                        {n === 0 ? "无信号" : `${n} 格信号`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : active.field === "battery" ? (
              <>
                {input("battery", "电量（0–100%）")}
                <label className="preview-editor-check">
                  <input
                    type="checkbox"
                    checked={draft.charging}
                    onChange={(event) =>
                      change("charging", event.target.checked)
                    }
                  />
                  正在充电
                </label>
              </>
            ) : active.field === "months" ? (
              <>
                <label className="preview-editor-field">
                  <span>固定存期</span>
                  <select
                    value={draft.months}
                    onChange={(event) =>
                      change("months", Number(event.target.value))
                    }
                  >
                    {TERMS.map((months) => (
                      <option key={months} value={months}>
                        {termLabel(months)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="preview-editor-note">
                  保存后按存期自动计算到期日。也可直接编辑画面中的到期日。
                </p>
              </>
            ) : active.field === "cropFooter" ||
              active.field === "showHotspot" ? (
              <label className="preview-editor-check">
                <input
                  type="checkbox"
                  checked={draft[active.field]}
                  onChange={(event) =>
                    change(
                      active.field as "cropFooter" | "showHotspot",
                      event.target.checked,
                    )
                  }
                />
                {active.field === "cropFooter"
                  ? "底部文字半截显示"
                  : "显示热点连接 1 台设备"}
              </label>
            ) : (
              <>
                {input(
                  active.field,
                  labels[active.field] +
                    (active.field === "amount"
                      ? "（元）"
                      : active.field === "rate"
                        ? "（%）"
                        : ""),
                )}
                {active.field === "endDate" && (
                  <p className="preview-editor-note">
                    保存后使用手动到期日期，按实际天数估算利息。
                  </p>
                )}
                {(active.field === "cardSuffix" ||
                  active.field === "accountSuffix") && (
                  <p className="preview-editor-note">
                    仅修改末尾 4 位数字，支持前导零。
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="field-error" id="preview-edit-error" role="alert">
                {error}
              </p>
            )}
            <div className="preview-editor-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => close(true)}
              >
                取消 <kbd>Esc</kbd>
              </button>
              <button type="submit" className="export-button">
                保存 <kbd>↵</kbd>
              </button>
            </div>
            <p className="preview-editor-note">点击外部也可保存</p>
          </form>,
          document.body,
        )}
    </>
  );
}
