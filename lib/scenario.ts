import type { ReadonlyURLSearchParams } from "next/navigation";

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
  parentStart: number;
  parentInc: number;
  parentEndYear: number;
  kidsStarts: number[];
  kidsYears: number;
  kidsAnnual: number;
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
  return { ...base, ...payload.params };
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
  const startYear = now.getUTCFullYear();
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

  const stockReturn = randomRounded(rng, 0.055, 0.07, 0.0005);
  const cashReturn = randomRounded(rng, 0.02, 0.035, 0.0005);
  const realEstateReturn = randomRounded(rng, 0.025, 0.04, 0.0005);
  const inflation = 0.02;

  const baseMonthly = randomRounded(rng, 6_000, 8_500, 250);
  const vacationMonthly = randomRounded(rng, 900, 1_400, 50);
  const homeUpgradesAnnual = randomRounded(rng, 10_000, 18_000, 1_000);

  const parentStart = startYear + randomInt(rng, 1, 3);
  const parentInc = randomRounded(rng, 1_000, 1_800, 100);
  const parentEndYear = parentStart + randomInt(rng, 8, 12);

  const kidsStarts = Array.from({ length: 3 }, (_, idx) => startYear + 3 + randomInt(rng, idx * 2, idx * 2 + 3)).sort(
    (a, b) => a - b,
  );
  const kidsYears = 4;
  const kidsAnnual = randomRounded(rng, 8_000, 12_000, 500);

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
    parentStart,
    parentInc,
    parentEndYear,
    kidsStarts,
    kidsYears,
    kidsAnnual,
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
