import type { DiscrepancySeverity } from "@/types/discrepancies";

export function compareNumericValues(params: {
  left: number | null;
  right: number | null;
  greenTolerance: number;
  yellowTolerance: number;
}): {
  severity: DiscrepancySeverity;
  variancePct: number | null;
  varianceAmount: number | null;
} {
  const { left, right, greenTolerance, yellowTolerance } = params;

  if (left == null || right == null) {
    return {
      severity: "yellow",
      variancePct: null,
      varianceAmount: null
    };
  }

  const denominator = right === 0 ? 1 : Math.abs(right);
  const varianceAmount = left - right;
  const variancePct = Math.abs(varianceAmount) / denominator;

  if (variancePct <= greenTolerance) {
    return {
      severity: "green",
      variancePct,
      varianceAmount
    };
  }

  if (variancePct <= yellowTolerance) {
    return {
      severity: "yellow",
      variancePct,
      varianceAmount
    };
  }

  return {
    severity: "red",
    variancePct,
    varianceAmount
  };
}

export function compareExactValues(left: string | number | null, right: string | number | null): DiscrepancySeverity {
  if (left == null || right == null) {
    return "yellow";
  }

  return `${left}` === `${right}` ? "green" : "red";
}

export function worstSeverity(severities: DiscrepancySeverity[]): DiscrepancySeverity {
  if (severities.includes("red")) {
    return "red";
  }

  if (severities.includes("yellow")) {
    return "yellow";
  }

  return "green";
}
