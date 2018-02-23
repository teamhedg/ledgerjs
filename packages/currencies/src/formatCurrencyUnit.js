//@flow
import type { Unit } from "./types";
import memoize from "lodash/memoize";

const nonBreakableSpace = " ";
const defaultFormatOptions = {
  locale: "en-EN",
  showCode: false,
  alwaysShowSign: false,
  // override showAllDigits of the unit
  showAllDigits: false
};

const getFragPositions = memoize((locale: string): Array<string> => {
  const res = (-1).toLocaleString(locale, {
    currency: "USD",
    style: "currency"
  });
  const frags = [];
  for (let i = 0; i < res.length; i++) {
    const c = res[i];
    if (c === "$") frags.push("code");
    else if (c === "-") frags.push("sign");
    else if (c === "1") frags.push("value");
    if (frags.length === 3) return frags;
  }
  return frags;
});

type FormatFragment =
  | { kind: "value", value: string }
  | { kind: "sign", value: string }
  | { kind: "code", value: string };

export function formatCurrencyUnitFragment(
  unit: Unit,
  value: number,
  options?: $Shape<typeof defaultFormatOptions>
): FormatFragment[] {
  const { showCode, alwaysShowSign, showAllDigits, locale } = {
    ...defaultFormatOptions,
    ...unit,
    ...options
  };
  const { magnitude, code } = unit;
  const floatValue = value / 10 ** magnitude;
  const floatValueAbs = Math.abs(floatValue);
  const minimumFractionDigits = showAllDigits ? magnitude : 0;
  const maximumFractionDigits = Math.max(
    minimumFractionDigits,
    Math.max(
      0,
      // dynamic max number of digits based on the value itself. to only show significant part
      Math.min(4 - Math.round(Math.log10(floatValueAbs)), magnitude)
    )
  );

  const frags = [];

  if (alwaysShowSign || floatValue < 0) {
    frags.push({ kind: "sign", value: floatValue < 0 ? "-" : "+" });
  }
  if (showCode) {
    frags.push({ kind: "code", value: code });
  }
  // TODO in case of negative value, we don't have it fragmented in a "sign"
  frags.push({
    kind: "value",
    value: floatValueAbs.toLocaleString(locale, {
      maximumFractionDigits,
      minimumFractionDigits
    })
  });

  const fragsPositions = getFragPositions(locale);
  frags.sort(
    (a, b) => fragsPositions.indexOf(a.kind) - fragsPositions.indexOf(b.kind)
  );
  return frags;
}

// simplification of formatCurrencyUnitFragment if no fragmented styles is needed
export function formatCurrencyUnit(
  unit: Unit,
  value: number,
  options?: $Shape<typeof defaultFormatOptions>
): string {
  return formatCurrencyUnitFragment(unit, value, options)
    .map(f => f.value)
    .join(nonBreakableSpace);
}
