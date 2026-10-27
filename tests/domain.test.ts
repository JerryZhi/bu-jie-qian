import test from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  decodeConfig,
  defaults,
  depositStatus,
  depositProgress,
  datesAtProgress,
  estimate,
  maturity,
  parseDate,
  validate,
} from "../src/domain.ts";

test("visit defaults use local wall-clock time and 16 calendar days earlier", (t) => {
  const draws = [0.00125, 0.98765];
  t.mock.method(Math, "random", () => draws.shift() ?? 0.5);
  const now = new Date(2026, 9, 23, 9, 7);
  const config = defaults(now);
  assert.equal(config.cardSuffix, "0012");
  assert.equal(config.accountSuffix, "9876");
  assert.equal(config.time, "09:07");
  assert.equal(config.startDate, "2026-10-07");
  assert.equal(config.endDate, "2029-10-07");
  assert.equal(defaults(new Date(2026, 0, 5, 0, 3)).startDate, "2025-12-20");
  assert.equal(defaults(new Date(2024, 2, 10)).startDate, "2024-02-23");
  assert.equal(now.getDate(), 23);
});

test("timeline uses elapsed calendar days and clamps future and mature dates", () => {
  const config = {
    ...defaults(),
    startDate: "2024-02-28",
    endDate: "2024-03-01",
    customEnd: true,
  };
  assert.equal(depositProgress(config, "2024-02-27"), 0);
  assert.equal(depositProgress(config, "2024-02-28"), 0);
  assert.equal(depositProgress(config, "2024-02-29"), 50);
  assert.equal(depositProgress(config, "2024-03-01"), 100);
  assert.equal(depositProgress(config, "2026-10-27"), 100);
  assert.equal(depositProgress({ ...config, endDate: config.startDate }), null);
  assert.equal(depositProgress({ ...config, startDate: "2024-02-30" }), null);
  assert.equal(depositProgress(config, "bad"), null);
});

test("dragging fixed terms retains calendar months and finds the nearest day", () => {
  for (const today of ["2024-02-29", "2026-10-27", "2025-01-31"]) {
    for (const months of [3, 6, 12, 36, 60]) {
      const original = { ...defaults(), startDate: "2024-01-31", months };
      for (const requested of [0, 1, 25, 50, 75, 99, 100]) {
        const patch = datesAtProgress(original, requested, today)!;
        const result = { ...original, ...patch };
        assert.ok(patch);
        assert.equal(result.customEnd, false);
        assert.equal(patch.endDate, addMonths(patch.startDate, months));
        assert.deepEqual(validate(result), {});
        assert.equal(estimate(result)?.interest, estimate(original)?.interest);
        const days = estimate(result)!.days;
        assert.ok(
          Math.abs(depositProgress(result, today)! - requested) <= 100 / days,
          `${today} ${months} months ${requested}%`,
        );
        if (requested === 0) assert.equal(patch.startDate, today);
        if (requested === 100) assert.ok(patch.endDate <= today);
      }
    }
  }
});

test("dragging custom dates preserves total days and interest, including a one-day term", () => {
  const original = {
    ...defaults(),
    startDate: "2024-02-28",
    endDate: "2024-03-09",
    customEnd: true,
  };
  const patch = datesAtProgress(original, 50, "2026-10-27")!;
  assert.deepEqual(patch, { startDate: "2026-10-22", endDate: "2026-11-01" });
  assert.equal(estimate({ ...original, ...patch })?.days, 10);
  assert.equal(
    estimate({ ...original, ...patch })?.interest,
    estimate(original)?.interest,
  );
  const oneDay = { ...original, endDate: "2024-02-29" };
  assert.deepEqual(datesAtProgress(oneDay, 100, "2026-10-27"), {
    startDate: "2026-10-26",
    endDate: "2026-10-27",
  });
  assert.deepEqual(
    datesAtProgress(oneDay, -10, "2026-10-27"),
    datesAtProgress(oneDay, 0, "2026-10-27"),
  );
  assert.deepEqual(
    datesAtProgress(oneDay, 200, "2026-10-27"),
    datesAtProgress(oneDay, 100, "2026-10-27"),
  );
});

test("timeline dragging rejects invalid dates and stays within supported date bounds", () => {
  const config = defaults();
  assert.equal(datesAtProgress(config, NaN), null);
  assert.equal(datesAtProgress({ ...config, startDate: "" }, 50), null);
  assert.equal(datesAtProgress({ ...config, months: 7 }, 50), null);
  const fullRange = {
    ...config,
    startDate: "1900-01-01",
    endDate: "2199-12-31",
    customEnd: true,
  };
  for (const percent of [0, 50, 100]) {
    assert.deepEqual(datesAtProgress(fullRange, percent), {
      startDate: fullRange.startDate,
      endDate: fullRange.endDate,
    });
    for (const today of ["1900-01-01", "2199-12-31"]) {
      const patch = datesAtProgress(config, percent, today)!;
      assert.deepEqual(validate({ ...config, ...patch }), {});
    }
  }
});

test("month-end and leap-year maturities stay in the intended month", () => {
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2023-01-31", 1), "2023-02-28");
  assert.equal(addMonths("2024-02-29", 12), "2025-02-28");
  assert.equal(addMonths("2026-10-31", 3), "2027-01-31");
  assert.equal(parseDate("2026-02-29"), null);
});

test("fixed term uses months/12 and rounds interest to cents", () => {
  const config = {
    ...defaults(),
    amount: "200000",
    rate: "2.65",
    startDate: "2026-10-23",
    months: 36,
  };
  assert.equal(maturity(config), "2029-10-23");
  assert.equal(estimate(config)?.interest, 15900);
  assert.equal(estimate(config)?.total, 215900);
  assert.equal(
    estimate({ ...config, amount: "12345.67", rate: "1.125", months: 3 })
      ?.interest,
    34.72,
  );
});

test("custom maturity uses UTC days and the stated 365-day basis", () => {
  const config = {
    ...defaults(),
    amount: "10000",
    rate: "3.65",
    startDate: "2024-02-28",
    customEnd: true,
    endDate: "2024-03-01",
  };
  assert.deepEqual(estimate(config), { interest: 2, total: 10002, days: 2 });
  assert.ok(validate({ ...config, endDate: config.startDate }).endDate);
  assert.ok(validate({ ...config, endDate: "2023-01-01" }).endDate);
});

test("bad inputs never become apparently valid numbers", () => {
  for (const amount of ["", "1e5", "-1", "0", "12.345", "1000000000", "NaN"]) {
    const config = { ...defaults(), amount };
    assert.ok(validate(config).amount, amount);
    assert.equal(estimate(config), null);
  }
  assert.ok(validate({ ...defaults(), rate: "" }).rate);
  assert.ok(validate({ ...defaults(), time: "25:61" }).time);
  assert.ok(validate({ ...defaults(), battery: "101" }).battery);
  assert.ok(validate({ ...defaults(), battery: "-1" }).battery);
  assert.ok(validate({ ...defaults(), battery: "2.5" }).battery);
  assert.equal(
    validate({ ...defaults(), battery: "0", rate: "0" }).battery,
    undefined,
  );
});

test("status handles future, active and matured deposits", () => {
  const config = { ...defaults(), startDate: "2026-10-23", months: 12 };
  assert.equal(depositStatus(config, "2026-10-22"), "未起息");
  assert.equal(depositStatus(config, "2026-10-23"), "存续中");
  assert.equal(depositStatus(config, "2027-10-23"), "已到期");
});

test("saved configuration is versioned and validated before restoration", () => {
  const config = defaults();
  const {
    cropFooter: _cropFooter,
    cardSuffix: _cardSuffix,
    accountSuffix: _accountSuffix,
    ...legacyConfig
  } = config;
  const migrated = decodeConfig(
    JSON.stringify({ version: 1, config: legacyConfig }),
  );
  assert.match(migrated!.cardSuffix, /^[0-9]{4}$/);
  assert.match(migrated!.accountSuffix, /^[0-9]{4}$/);
  assert.equal(
    validate({ ...config, cardSuffix: "0012", accountSuffix: "0000" })
      .cardSuffix,
    undefined,
  );
  assert.ok(validate({ ...config, cardSuffix: "123" }).cardSuffix);
  assert.ok(validate({ ...config, accountSuffix: "12ab" }).accountSuffix);
  assert.equal(
    decodeConfig(
      JSON.stringify({
        version: 1,
        config: { ...legacyConfig, amount: "12345" },
      }),
    )?.amount,
    "12345",
  );
  assert.equal(
    decodeConfig(JSON.stringify({ version: 1, config: legacyConfig }))
      ?.cropFooter,
    true,
  );
  assert.equal(
    decodeConfig(
      JSON.stringify({ version: 1, config: { ...config, cropFooter: false } }),
    )?.cropFooter,
    false,
  );
  assert.deepEqual(
    decodeConfig(JSON.stringify({ version: 1, config })),
    config,
  );
  assert.equal(decodeConfig("{bad JSON"), null);
  assert.equal(decodeConfig(JSON.stringify({ version: 2, config })), null);
  assert.equal(
    decodeConfig(
      JSON.stringify({ version: 1, config: { ...config, amount: -5 } }),
    ),
    null,
  );
  assert.equal(
    decodeConfig(
      JSON.stringify({ version: 1, config: { ...config, scale: 100 } }),
    ),
    null,
  );
});

test("hotspot defaults off while legacy settings retain their previous appearance", () => {
  const config = defaults();
  assert.equal(config.showHotspot, false);
  const { showHotspot: _showHotspot, ...legacy } = config;
  const restored = decodeConfig(JSON.stringify({ version: 1, config: legacy }));
  assert.deepEqual(restored, { ...config, showHotspot: true });
  for (const showHotspot of [true, false]) {
    assert.equal(
      decodeConfig(
        JSON.stringify({ version: 1, config: { ...config, showHotspot } }),
      )?.showHotspot,
      showHotspot,
    );
  }
  assert.equal(
    decodeConfig(
      JSON.stringify({
        version: 1,
        config: { ...config, showHotspot: "false" },
      }),
    ),
    null,
  );
});
