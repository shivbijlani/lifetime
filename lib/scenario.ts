import type { ReadonlyURLSearchParams } from "next/navigation";

export type SupportCategory = "elderCare" | "childSupport";
export type SupportModelType = "flat" | "linear";

export type SupportPlan = {
  name: string;
  category: SupportCategory;
  startYear: number;
  endYear: number;
  annualAmount: number;
  model: SupportModelType;
  annualIncrease: number;
};

export type MortgagePlan = {
  name: string;
  principal: number;
  rate: number;
  paymentMonthly: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
};

export type ScenarioParams = {
  startYear: number;
  currentAge: number;
  spouseAge: number;
  retirementAge: number;
  maxAge: number;
  stocks0: number;
  cash0: number;
  realEstate0: number;
  mortgages: MortgagePlan[];
  stockReturn: number;
  cashReturn: number;
  realEstateReturn: number;
  inflation: number;
  baseMonthly: number;
  vacationMonthly: number;
  homeUpgradesAnnual: number;
  supports: SupportPlan[];
  contribution0: number;
  contributionGrowth: number;
  spendFromStocks: boolean;
  useGlidepath: boolean;
  gpRetMinus20: number;
  gpRetMinus10: number;
  gpRetMinus5: number;
  gpRet0: number;
  gpPostRet: number;
};

type ScenarioPayload = {
  version: number;
  params?: Partial<ScenarioParams>;
};

const SCENARIO_PARAM_KEY = "scenario";

export function defaultParams(): ScenarioParams {
  return generateSmartDefaults();
}

export function deriveParamsFromQuery(searchParams: ReadonlyURLSearchParams | null): ScenarioParams {
  const base = defaultParams();
  if (!searchParams) return base;
  const raw = searchParams.get(SCENARIO_PARAM_KEY);
  if (!raw) return base;
  const payload = parseScenarioPayload(raw);
  if (!payload) return base;
  if (payload.version !== 1) {
    console.warn(`Unsupported scenario payload version: ${payload.version}`);
    return base;
  }
  if (!payload.params || typeof payload.params !== "object") return base;
  const overrides = Object.fromEntries(
    Object.entries(payload.params).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
  return mergeScenarioOverrides(base, overrides);
}

function parseScenarioPayload(raw: string): ScenarioPayload | null {
  try {
    return validateScenarioPayload(JSON.parse(raw));
  } catch (_) {
    const decoder = typeof globalThis.atob === "function" ? globalThis.atob : null;
    if (!decoder) return null;
    try {
      return validateScenarioPayload(JSON.parse(decoder(raw)));
    } catch {
      return null;
    }
  }
}

function validateScenarioPayload(candidate: unknown): ScenarioPayload | null {
  if (!candidate || typeof candidate !== "object") return null;
  const maybe = candidate as Partial<ScenarioPayload>;
  if (typeof maybe.version !== "number") return null;
  if (maybe.params && typeof maybe.params !== "object") return null;
  return { version: maybe.version, params: maybe.params ?? undefined };
}

function generateSmartDefaults(): ScenarioParams {
  const now = new Date();
  const startYear = now.getUTCFullYear() + 1;
  const seedBase =
    startYear * 1_000_000 +
    (now.getUTCMonth() + 1) * 10_000 +
    now.getUTCDate() * 100 +
    now.getUTCHours();
  const rng = createDeterministicRng(seedBase);

  const currentAge = randomInt(rng, 32, 46);
  const spouseAge = clampNumber(currentAge + randomInt(rng, -3, 3), 30, 60);
  const retirementAge = clampNumber(currentAge + randomInt(rng, 18, 24), currentAge + 15, 68);
  const maxAge = retirementAge + randomInt(rng, 25, 33);

  const stocks0 = randomRounded(rng, 900_000, 2_200_000, 25_000);
  const cash0 = randomRounded(rng, 120_000, 260_000, 10_000);
  const realEstate0 = randomRounded(rng, 850_000, 1_350_000, 25_000);

  const mortgagePrincipal = randomRounded(rng, Math.round(realEstate0 * 0.35), Math.round(realEstate0 * 0.6), 10_000);
  const mortgageRate = randomRounded(rng, 0.0375, 0.055, 0.0005);
  const mortgageTermYears = randomInt(rng, 15, 25);
  const mortgageEndYear = startYear + mortgageTermYears;
  const mortgageEndMonth = randomInt(rng, 1, 12);
  const mortgagePaymentMonthly = calculateMortgagePayment(mortgagePrincipal, mortgageRate, mortgageTermYears);

  const stockReturn = 0.07;
  const cashReturn = 0.02;
  const realEstateReturn = randomRounded(rng, 0.025, 0.04, 0.0005);
  const inflation = 0.028;

  const baseMonthly = randomRounded(rng, 6_000, 8_500, 250);
  const vacationMonthly = randomRounded(rng, 900, 1_400, 50);
  const homeUpgradesAnnual = randomRounded(rng, 10_000, 18_000, 1_000);

  const contribution0 = randomRounded(rng, 40_000, 70_000, 2_500);
  const contributionGrowth = randomRounded(rng, 0.025, 0.04, 0.0005);

  const mortgages = assignMortgageNames([
    {
      name: "Mortgage 1",
      principal: mortgagePrincipal,
      rate: mortgageRate,
      paymentMonthly: mortgagePaymentMonthly,
      startYear,
      startMonth: 1,
      endYear: mortgageEndYear,
      endMonth: mortgageEndMonth,
    },
  ]);

  return {
    startYear,
    currentAge,
    spouseAge,
    retirementAge,
    maxAge,
    stocks0,
    cash0,
    realEstate0,
    mortgages,
    stockReturn,
    cashReturn,
    realEstateReturn,
    inflation,
    baseMonthly,
    vacationMonthly,
    homeUpgradesAnnual,
    supports: [],
    contribution0,
    contributionGrowth,
    spendFromStocks: true,
    useGlidepath: true,
    gpRetMinus20: 0.1,
    gpRetMinus10: 0.085,
    gpRetMinus5: 0.065,
    gpRet0: 0.05,
    gpPostRet: 0.04,
  };
}

function mergeScenarioOverrides(base: ScenarioParams, overridesRaw: Record<string, unknown>): ScenarioParams {
  const result: ScenarioParams = {
    ...base,
    supports: base.supports.map((support) => ({ ...support })),
    mortgages: base.mortgages.map((mortgage) => ({ ...mortgage })),
  };

  if (Object.prototype.hasOwnProperty.call(overridesRaw, "supports")) {
    const parsed = sanitizeSupportPlans(overridesRaw["supports"]);
    result.supports = assignSupportNames(parsed);
  }

  if (Object.prototype.hasOwnProperty.call(overridesRaw, "mortgages")) {
    const parsed = sanitizeMortgagePlans(overridesRaw["mortgages"], base.startYear);
    result.mortgages = assignMortgageNames(parsed);
  }

  for (const key of Object.keys(base)) {
    if (key === "supports" || key === "mortgages") continue;
    if (Object.prototype.hasOwnProperty.call(overridesRaw, key)) {
      (result as Record<string, unknown>)[key] = overridesRaw[key];
    }
  }

  return result;
}

function sanitizeSupportPlans(input: unknown): SupportPlan[] {
  if (!Array.isArray(input)) return [];
  const supports: SupportPlan[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const startYear = asNumber(candidate.startYear);
    const endYear =
      asNumber(candidate.endYear ?? candidate.stopYear ?? candidate.finishYear) ?? (startYear !== null ? startYear : null);
    const annualAmount = asNumber(candidate.annualAmount ?? candidate.amount ?? candidate.firstYearAmount);
    if (startYear === null || endYear === null || endYear < startYear || annualAmount === null || annualAmount <= 0)
      continue;
    const model = normalizeSupportModel(candidate.model ?? candidate.rateModelType);
    const annualIncreaseRaw =
      asNumber(candidate.annualIncrease ?? candidate.increase ?? candidate.rate ?? candidate.growth ?? 0) ?? 0;
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : model === "linear"
        ? "Support Plan (Linear)"
        : "Support Plan (Flat)";
    supports.push({
      name,
      category: normalizeSupportCategory(candidate.category ?? candidate.type ?? candidate.kind ?? name, name),
      startYear,
      endYear,
      annualAmount,
      model,
      annualIncrease: model === "linear" ? annualIncreaseRaw : 0,
    });
  }
  return supports;
}

function sanitizeMortgagePlans(input: unknown, defaultStartYear: number): MortgagePlan[] {
  if (!Array.isArray(input)) return [];
  const mortgages: MortgagePlan[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const principal = asNumber(candidate.principal ?? candidate.balance ?? candidate.amount ?? candidate.mortgage0);
    const rate = asNumber(candidate.rate ?? candidate.mortgageRate);
    const paymentMonthly = asNumber(candidate.paymentMonthly ?? candidate.payment ?? candidate.monthlyPayment);
    const startYear = asNumber(candidate.startYear) ?? defaultStartYear;
    const startMonth = clampMonthNumber(asNumber(candidate.startMonth), 1);
    const endYear = asNumber(candidate.endYear);
    const endMonth = clampMonthNumber(asNumber(candidate.endMonth ?? candidate.endMonthIndex ?? candidate.monthEnd), 12);
    if (
      principal === null ||
      principal <= 0 ||
      rate === null ||
      rate < 0 ||
      paymentMonthly === null ||
      paymentMonthly <= 0 ||
      endYear === null ||
      endYear < startYear
    ) {
      continue;
    }
    mortgages.push({
      name: typeof candidate.name === "string" ? candidate.name : "",
      principal,
      rate,
      paymentMonthly,
      startYear,
      startMonth,
      endYear,
      endMonth,
    });
  }
  return mortgages;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeSupportModel(raw: unknown): SupportModelType {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized.startsWith("lin")) return "linear";
  }
  return "flat";
}

function normalizeSupportCategory(raw: unknown, fallbackName: unknown): SupportCategory {
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (
    normalized.includes("child") ||
    normalized.includes("kid") ||
    normalized.includes("college") ||
    normalized.includes("offspring")
  ) {
    return "childSupport";
  }
  if (
    normalized.includes("elder") ||
    normalized.includes("parent") ||
    normalized.includes("care") ||
    normalized.includes("family")
  ) {
    return "elderCare";
  }
  const fallback = typeof fallbackName === "string" ? fallbackName.trim().toLowerCase() : "";
  if (fallback.includes("child") || fallback.includes("college") || fallback.includes("kid")) {
    return "childSupport";
  }
  return "elderCare";
}

function assignSupportNames(plans: SupportPlan[]): SupportPlan[] {
  let elderIndex = 0;
  let childIndex = 0;
  return plans.map((plan) => {
    if (plan.category === "elderCare") {
      elderIndex += 1;
      const name = elderIndex === 1 ? "Parent" : `Parent ${elderIndex}`;
      return { ...plan, name, model: "linear" };
    }
    childIndex += 1;
    const name = `Child ${childIndex}`;
    return { ...plan, name, model: "flat", annualIncrease: 0 };
  });
}

function assignMortgageNames(plans: MortgagePlan[]): MortgagePlan[] {
  return plans.map((plan, idx) => {
    const name =
      typeof plan.name === "string" && plan.name.trim().length > 0 ? plan.name.trim() : `Mortgage ${idx + 1}`;
    return {
      ...plan,
      name,
      startMonth: clampMonthNumber(plan.startMonth, 1),
      endMonth: clampMonthNumber(plan.endMonth, 12),
    };
  });
}

function clampMonthNumber(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 12) return 12;
  return rounded;
}

function createDeterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomRounded(rng: () => number, min: number, max: number, step: number): number {
  const raw = min + (max - min) * rng();
  return Math.round(raw / step) * step;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateMortgagePayment(principal: number, annualRate: number, termYears: number): number {
  const monthlyRate = annualRate / 12;
  const totalPayments = termYears * 12;
  if (monthlyRate === 0) return Math.round(principal / totalPayments);
  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments));
  return Math.round(payment);
}

export const scenarioHelpers = {
  defaultParams,
  deriveParamsFromQuery,
};
