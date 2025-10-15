import type { ReadonlyURLSearchParams } from "next/navigation";

export type ElderCareSupport = {
  startYear: number;
  endYear: number;
  firstYearAmount: number;
  annualIncrease: number;
};

export type ChildSupport = {
  startYear: number;
  years: number;
  annualAmount: number;
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
  mortgage0: number;
  mortgageRate: number;
  mortgagePaymentMonthly: number;
  mortgageEndYear: number;
  mortgageEndMonth: number;
  stockReturn: number;
  cashReturn: number;
  realEstateReturn: number;
  inflation: number;
  baseMonthly: number;
  vacationMonthly: number;
  homeUpgradesAnnual: number;
  elderCare: ElderCareSupport[];
  childSupports: ChildSupport[];
  kidsStarts: number[];
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

  const mortgage0 = randomRounded(rng, Math.round(realEstate0 * 0.35), Math.round(realEstate0 * 0.6), 10_000);
  const mortgageRate = randomRounded(rng, 0.0375, 0.055, 0.0005);
  const mortgageTermYears = randomInt(rng, 15, 25);
  const mortgageEndYear = startYear + mortgageTermYears;
  const mortgageEndMonth = randomInt(rng, 1, 12);
  const mortgagePaymentMonthly = calculateMortgagePayment(mortgage0, mortgageRate, mortgageTermYears);

  const stockReturn = 0.07;
  const cashReturn = 0.02;
  const realEstateReturn = randomRounded(rng, 0.025, 0.04, 0.0005);
  const inflation = 0.028;

  const baseMonthly = randomRounded(rng, 6_000, 8_500, 250);
  const vacationMonthly = randomRounded(rng, 900, 1_400, 50);
  const homeUpgradesAnnual = randomRounded(rng, 10_000, 18_000, 1_000);

  const contribution0 = randomRounded(rng, 40_000, 70_000, 2_500);
  const contributionGrowth = randomRounded(rng, 0.025, 0.04, 0.0005);

  return {
    startYear,
    currentAge,
    spouseAge,
    retirementAge,
    maxAge,
    stocks0,
    cash0,
    realEstate0,
    mortgage0,
    mortgageRate,
    mortgagePaymentMonthly,
    mortgageEndYear,
    mortgageEndMonth,
    stockReturn,
    cashReturn,
    realEstateReturn,
    inflation,
    baseMonthly,
    vacationMonthly,
    homeUpgradesAnnual,
    elderCare: [],
    childSupports: [],
    kidsStarts: [],
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

const LEGACY_PARENT_FIRST_YEAR_AMOUNT = 10_000;

function mergeScenarioOverrides(base: ScenarioParams, overridesRaw: Record<string, unknown>): ScenarioParams {
  const result: ScenarioParams = {
    ...base,
    elderCare: base.elderCare.slice(),
    childSupports: base.childSupports.slice(),
    kidsStarts: base.kidsStarts.slice(),
  };

  const knownKeys = new Set(Object.keys(base));
  let elderCareExplicit = false;
  let childSupportsExplicit = false;
  let kidsStartsExplicit = false;

  if (Object.prototype.hasOwnProperty.call(overridesRaw, "elderCare")) {
    const parsed = sanitizeElderCareSupports(overridesRaw["elderCare"]);
    result.elderCare = parsed;
    elderCareExplicit = true;
  }

  if (Object.prototype.hasOwnProperty.call(overridesRaw, "childSupports")) {
    const parsed = sanitizeChildSupports(overridesRaw["childSupports"]);
    result.childSupports = parsed;
    childSupportsExplicit = true;
  }

  if (Object.prototype.hasOwnProperty.call(overridesRaw, "kidsStarts")) {
    const parsed = sanitizeKidsStarts(overridesRaw["kidsStarts"]);
    result.kidsStarts = parsed;
    kidsStartsExplicit = true;
  }

  for (const key of knownKeys) {
    if (key === "elderCare" || key === "childSupports" || key === "kidsStarts") continue;
    if (Object.prototype.hasOwnProperty.call(overridesRaw, key)) {
      (result as Record<string, unknown>)[key] = overridesRaw[key];
    }
  }

  if (!elderCareExplicit) {
    const legacy = extractLegacyElderCare(overridesRaw);
    if (legacy.length > 0) {
      result.elderCare = legacy;
    }
  }

  if (!childSupportsExplicit) {
    const legacy = extractLegacyChildSupports(overridesRaw);
    if (legacy.supports.length > 0) {
      result.childSupports = legacy.supports;
    }
    if (!kidsStartsExplicit && legacy.starts.length > 0) {
      result.kidsStarts = legacy.starts;
    }
  }

  return result;
}

function sanitizeElderCareSupports(input: unknown): ElderCareSupport[] {
  if (!Array.isArray(input)) return [];
  const supports: ElderCareSupport[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const startYear = asNumber(candidate.startYear);
    const endYear = asNumber(candidate.endYear ?? candidate.stopYear ?? candidate.finishYear ?? candidate.startYear);
    const firstYearAmount = asNumber(candidate.firstYearAmount ?? candidate.amount ?? candidate.baseAnnual);
    const annualIncrease = asNumber(candidate.annualIncrease ?? candidate.increase ?? 0) ?? 0;
    if (startYear === null || endYear === null || endYear < startYear || firstYearAmount === null || firstYearAmount <= 0)
      continue;
    supports.push({
      startYear,
      endYear,
      firstYearAmount,
      annualIncrease,
    });
  }
  return supports;
}

function sanitizeChildSupports(input: unknown): ChildSupport[] {
  if (!Array.isArray(input)) return [];
  const supports: ChildSupport[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const startYear = asNumber(candidate.startYear);
    const years = asNumber(candidate.years ?? candidate.duration ?? candidate.length);
    const annualAmount = asNumber(candidate.annualAmount ?? candidate.amount);
    if (startYear === null || annualAmount === null || annualAmount <= 0 || years === null || years <= 0) continue;
    const duration = years;
    supports.push({
      startYear,
      years: duration,
      annualAmount,
    });
  }
  return supports;
}

function sanitizeKidsStarts(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => asNumber(value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
}

function extractLegacyElderCare(overridesRaw: Record<string, unknown>): ElderCareSupport[] {
  const startYear = asNumber(overridesRaw["parentStart"]);
  const endYear = asNumber(overridesRaw["parentEndYear"]);
  if (startYear === null || endYear === null) return [];
  const firstYearAmount =
    asNumber(overridesRaw["parentBaseAnnual"] ?? overridesRaw["parentAnnual"]) ?? LEGACY_PARENT_FIRST_YEAR_AMOUNT;
  if (firstYearAmount <= 0) return [];
  const inc = asNumber(overridesRaw["parentInc"]) ?? 0;
  return [
    {
      startYear,
      endYear,
      firstYearAmount,
      annualIncrease: inc,
    },
  ];
}

function extractLegacyChildSupports(overridesRaw: Record<string, unknown>): { supports: ChildSupport[]; starts: number[] } {
  const rawStarts = overridesRaw["kidsStarts"];
  const annualAmount = asNumber(overridesRaw["kidsAnnual"]);
  const years = asNumber(overridesRaw["kidsYears"]);
  if (!Array.isArray(rawStarts) || annualAmount === null || annualAmount <= 0 || years === null || years <= 0) {
    return { supports: [], starts: [] };
  }
  const sanitizedStarts = rawStarts
    .map((value) => asNumber(value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  return {
    starts: sanitizedStarts,
    supports: sanitizedStarts.map((startYear) => ({
      startYear,
      years,
      annualAmount,
    })),
  };
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
