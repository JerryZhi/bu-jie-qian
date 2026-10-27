import { useEffect, useRef, useState } from "react";
import {
  datesAtProgress,
  depositProgress,
  localDate,
  maturity,
  parseDate,
  type Config,
} from "./domain";
import type { PreviewEditProps, PreviewField } from "./PreviewEditor";

type DatePatch = Pick<Config, "startDate" | "endDate">;

export default function DepositTimeline({
  config,
  editProps,
  onChange,
  onDraggingChange,
}: {
  config: Config;
  editProps: (field: PreviewField) => PreviewEditProps;
  onChange?: (patch: DatePatch) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const [today, setToday] = useState(localDate);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    config: Config;
    today: string;
    pointerId: number;
  } | null>(null);
  const progress = depositProgress(config, today);
  const percent = progress ?? 0;
  const interactive = !!onChange && progress !== null;
  const end = maturity(config);

  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  function move(clientX: number, target: HTMLElement) {
    const baseline = drag.current;
    if (!baseline) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width) return;
    const patch = datesAtProgress(
      baseline.config,
      ((clientX - rect.left) / rect.width) * 100,
      baseline.today,
    );
    if (patch) onChange?.(patch);
  }

  function finish(target: HTMLElement, cancel = false) {
    const baseline = drag.current;
    if (!baseline) return;
    drag.current = null;
    if (cancel)
      onChange?.({
        startDate: baseline.config.startDate,
        endDate: baseline.config.endDate,
      });
    if (target.hasPointerCapture(baseline.pointerId))
      target.releasePointerCapture(baseline.pointerId);
    setDragging(false);
    onDraggingChange?.(false);
  }

  return (
    <div className="deposit-timeline">
      <div className="timeline-control">
        <div
          className="timeline-track"
          role={interactive ? undefined : "progressbar"}
          aria-hidden={interactive || undefined}
          aria-label="存款期限进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        {interactive && (
          <div
            className={`timeline-slider${dragging ? " is-dragging" : ""}`}
            role="slider"
            tabIndex={0}
            aria-label="存款期限进度"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(percent.toFixed(1))}
            aria-valuetext={`${percent.toFixed(1)}%，起息日 ${config.startDate}，到期日 ${end}`}
            title="拖动调整日期，保留存期；方向键微调，Home / End 跳到两端，Esc 撤销本次拖动"
            onPointerDown={(event) => {
              if (event.button !== 0 || drag.current) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { config, today, pointerId: event.pointerId };
              setDragging(true);
              onDraggingChange?.(true);
              move(event.clientX, event.currentTarget);
            }}
            onPointerMove={(event) => {
              if (drag.current?.pointerId === event.pointerId)
                move(event.clientX, event.currentTarget);
            }}
            onPointerUp={(event) => {
              if (drag.current?.pointerId !== event.pointerId) return;
              move(event.clientX, event.currentTarget);
              finish(event.currentTarget);
            }}
            onPointerCancel={(event) => {
              if (drag.current?.pointerId === event.pointerId)
                finish(event.currentTarget, true);
            }}
            onLostPointerCapture={(event) => {
              if (drag.current?.pointerId === event.pointerId)
                finish(event.currentTarget, true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && drag.current) {
                event.preventDefault();
                finish(event.currentTarget, true);
                return;
              }
              if (drag.current) return;
              const totalDays =
                (parseDate(end)!.getTime() -
                  parseDate(config.startDate)!.getTime()) /
                86400000;
              const step =
                Math.max(1, 100 / totalDays) * (event.shiftKey ? 10 : 1);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 100
                    : ["ArrowRight", "ArrowUp"].includes(event.key)
                      ? percent + step
                      : ["ArrowLeft", "ArrowDown"].includes(event.key)
                        ? percent - step
                        : null;
              if (next === null) return;
              event.preventDefault();
              const patch = datesAtProgress(config, next, today);
              if (patch) onChange?.(patch);
            }}
          >
            <span className="timeline-thumb" style={{ left: `${percent}%` }} />
          </div>
        )}
      </div>
      <div className="timeline-labels">
        <div>
          <strong>起息日</strong>
          <span {...editProps("startDate")}>
            {progress === null ? "—" : config.startDate.replaceAll("-", ".")}
          </span>
        </div>
        <div>
          <strong>到期日</strong>
          <span {...editProps("endDate")}>
            {progress === null ? "—" : end.replaceAll("-", ".")}
          </span>
        </div>
      </div>
    </div>
  );
}
