'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, Link2, Plus, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useSearchParams } from "next/navigation";
import {
  defaultParams,
  deriveParamsFromQuery,
  type ScenarioParams,
  type ElderCareSupport,
  type ChildSupport,
} from "@/lib/scenario";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/branding";

type Row = {
  year: number;
  age: number;
  stockReturnApplied: number;
  contribution: number;
  income: number;
  expenses: {
    base: number;
    mortgage: number;
    vacation: number;
    upgrades: number;
    parents: number;
    kids: number;
  };
  totals: {
    totalExpenses: number;
    savingsFundedExpenses: number;
    stocksEnd: number;
    cashEnd: number;
    realEstateEnd: number;
    mortgage: number;
    netWorth: number;
  };
};

type Params = ScenarioParams;

function expectedStockReturn(age: number, p: Params): number {
  const yearsToRetire = p.retirementAge - age;
  if (yearsToRetire >= 15) return p.gpRetMinus20;
  if (yearsToRetire >= 7 && yearsToRetire < 15) return p.gpRetMinus10;
  if (yearsToRetire >= 2 && yearsToRetire < 7) return p.gpRetMinus5;
  if (yearsToRetire >= 0 && yearsToRetire < 2) return p.gpRet0;
  return p.gpPostRet;
}

function computeModel(p: Params) {
  const rows: Row[] = [];
  let stocks = p.stocks0;
  let cash = p.cash0;
  let re = p.realEstate0;
  let mortgage = p.mortgage0;
  const mr = p.mortgageRate / 12;
  const endYear = p.startYear + (p.maxAge - p.currentAge);
  for (let year = p.startYear; year <= endYear; year++) {
    const yrIndex = year - p.startYear;
    const age = p.currentAge + yrIndex;
    const working = age < p.retirementAge;
    const contribution = working ? p.contribution0 * Math.pow(1 + p.contributionGrowth, yrIndex) : 0;
    const baseAnnual = p.baseMonthly * 12 * Math.pow(1 + p.inflation, yrIndex);
    const vacAnnual = p.vacationMonthly * 12 * Math.pow(1 + p.inflation, yrIndex);
    const upgrades = p.homeUpgradesAnnual * Math.pow(1 + p.inflation, yrIndex);
    let mortAnnual = 0;
    if (mortgage > 0) {
      for (let m = 1; m <= 12; m++) {
        const inWindow = year < p.mortgageEndYear || (year === p.mortgageEndYear && m <= p.mortgageEndMonth);
        if (!inWindow || mortgage <= 0) break;
        const interest = mortgage * mr;
        const principal = Math.min(Math.max(p.mortgagePaymentMonthly - interest, 0), mortgage);
        mortAnnual += principal + interest;
        mortgage -= principal;
      }
    }
    const parents = p.elderCare.reduce((total, support) => {
      if (year < support.startYear || year > support.endYear) return total;
      const yearsSinceStart = year - support.startYear;
      const amount = support.firstYearAmount + support.annualIncrease * yearsSinceStart;
      return total + Math.max(0, amount);
    }, 0);
    const kids = p.childSupports.reduce((total, support) => {
      if (year < support.startYear || year >= support.startYear + support.years) return total;
      return total + Math.max(0, support.annualAmount);
    }, 0);
    const incomeFunded = baseAnnual + mortAnnual + vacAnnual + upgrades;
    const totalExpenses = incomeFunded + parents + kids;
    const income = working ? incomeFunded : 0;
    const savingsFundedExpenses = Math.max(totalExpenses - income, 0);
    const stockR = p.useGlidepath ? expectedStockReturn(age, p) : p.stockReturn;
    const stocksBefore = stocks * (1 + stockR);
    const cashBefore = cash * (1 + p.cashReturn);
    const reBefore = re * (1 + p.realEstateReturn);
    let stocksAfter = stocksBefore + contribution;
    let cashAfter = cashBefore;
    let remainingExpenses = savingsFundedExpenses;
    if (p.spendFromStocks) {
      const coveredByStocks = Math.min(stocksAfter, remainingExpenses);
      stocksAfter -= coveredByStocks;
      remainingExpenses -= coveredByStocks;
      if (remainingExpenses > 0) {
        const coveredByCash = Math.min(cashAfter, remainingExpenses);
        cashAfter -= coveredByCash;
        remainingExpenses -= coveredByCash;
      }
    } else {
      const coveredByCash = Math.min(cashAfter, remainingExpenses);
      cashAfter -= coveredByCash;
      remainingExpenses -= coveredByCash;
      if (remainingExpenses > 0) {
        const coveredByStocks = Math.min(stocksAfter, remainingExpenses);
        stocksAfter -= coveredByStocks;
        remainingExpenses -= coveredByStocks;
      }
    }
    const shortfall = Math.max(0, remainingExpenses);
    const hasShortfall = shortfall > 1e-6;
    if (hasShortfall) {
      stocksAfter = 0;
      cashAfter = 0;
    }
    stocks = Math.max(0, stocksAfter);
    cash = Math.max(0, cashAfter);
    re = reBefore;
    const netWorth = hasShortfall ? 0 : stocks + cash + (re - mortgage);
    rows.push({
      year,
      age,
      stockReturnApplied: stockR,
      contribution,
      income,
      expenses: { base: baseAnnual, mortgage: mortAnnual, vacation: vacAnnual, upgrades, parents, kids },
      totals: { totalExpenses, savingsFundedExpenses, stocksEnd: stocks, cashEnd: cash, realEstateEnd: re, mortgage, netWorth },
    });
  }
  return rows;
}

const currency = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const trendLineColors = {
  netWorth: "#2563eb",
  stocks: "#16a34a",
  cash: "#f59e0b",
  realEstateEquity: "#9333ea",
};

export default function App() {
  const searchParams = useSearchParams();
  const initialParamsRef = useRef<Params | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!initialParamsRef.current) {
    initialParamsRef.current = deriveParamsFromQuery(searchParams);
  }
  const [params, setParams] = useState<Params>(() => initialParamsRef.current ?? defaultParams());
  const [realDollars, setRealDollars] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const rows = useMemo(() => computeModel(params), [params]);
  const projectionEndYear = params.startYear + (params.maxAge - params.currentAge);
  const realFactor = (year: number) => (realDollars ? 1 / Math.pow(1 + params.inflation, year - params.startYear) : 1);
  const incomeFundedSubtotal =
    params.baseMonthly * 12 + params.vacationMonthly * 12 + params.homeUpgradesAnnual + params.mortgagePaymentMonthly * 12;
  const handleCopyReset = useCallback(() => {
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }
  }, []);
  const handleSave = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      handleCopyReset();
      const payload = { version: 1, params };
      const base64 = typeof window.btoa === "function" ? window.btoa(JSON.stringify(payload)) : null;
      if (!base64) throw new Error("Missing base64 encoder");
      const shareUrl = new URL(window.location.pathname, window.location.origin);
      shareUrl.searchParams.set("scenario", base64);
      const text = shareUrl.toString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopyStatus("copied");
      copyResetTimer.current = setTimeout(() => {
        setCopyStatus("idle");
        copyResetTimer.current = null;
      }, 2500);
    } catch (error) {
      console.error("Failed to copy scenario link", error);
      setCopyStatus("error");
      copyResetTimer.current = setTimeout(() => {
        setCopyStatus("idle");
        copyResetTimer.current = null;
      }, 4000);
    }
  }, [handleCopyReset, params]);
  useEffect(() => () => handleCopyReset(), [handleCopyReset]);
  useEffect(() => {
    const p = defaultParams();
    p.maxAge = 65;
    const r = computeModel(p);
    const expected = (p.startYear + (p.maxAge - p.currentAge)) - p.startYear + 1;
    console.assert(r.length === expected, "row count matches span");
    const p2 = { ...defaultParams(), mortgage0: 100_000, mortgageRate: 0.05, mortgagePaymentMonthly: 1_000, mortgageEndYear: 2027, mortgageEndMonth: 6, maxAge: 70 } as Params;
    const r2 = computeModel(p2);
    const afterEnd = r2.filter(x => x.year > p2.mortgageEndYear).every(x => Math.abs(x.expenses.mortgage) < 1e-6);
    console.assert(afterEnd, "mortgage ends when specified");
    const p3a = { ...defaultParams(), spendFromStocks: true, maxAge: 62 } as Params;
    const p3b = { ...defaultParams(), spendFromStocks: false, cash0: 1_000_000, maxAge: 62 } as Params;
    const r3a = computeModel(p3a).at(-1)!;
    const r3b = computeModel(p3b).at(-1)!;
    console.assert(r3b.totals.cashEnd < 1_000_000, "cash drawn when not spending from stocks");
    console.assert(r3b.totals.stocksEnd > r3a.totals.stocksEnd, "stocks higher when using cash first");
    const p4 = { ...defaultParams(), useGlidepath: true, retirementAge: 60, currentAge: 41, maxAge: 45 } as Params;
    const r4 = computeModel(p4);
    const hasStockR = r4.some(x => x.stockReturnApplied > 0);
    console.assert(hasStockR, "glidepath applies returns each year");
  }, []);
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
        <span>{SITE_TITLE}</span>
        <span className="text-base font-normal text-muted-foreground">{SITE_TAGLINE}</span>
      </h1>
      <p className="text-sm opacity-80">
        Explore your lifetime finances, modeled privately on your device — no logins, no servers. Move the sliders, add
        life events, and see how your plan holds up.
      </p>
      <Card className="shadow-md">
        <CardContent className="p-4 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold m-0">Timeline for age</h2>
                <Input
                  aria-label="Current age"
                  type="number"
                  className="w-24"
                  min={18}
                  max={70}
                  value={params.currentAge}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    const bounded = Math.min(Math.max(Math.round(next), 0), 120);
                    setParams((prev) => ({
                      ...prev,
                      currentAge: bounded,
                      retirementAge: Math.max(bounded, prev.retirementAge),
                    }));
                  }}
                  onBlur={() =>
                    setParams((prev) => {
                      const clamped = Math.max(18, Math.min(prev.currentAge, 70));
                      if (clamped === prev.currentAge) return prev;
                      return {
                        ...prev,
                        currentAge: clamped,
                        retirementAge: Math.max(clamped, prev.retirementAge),
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Retirement Age: {params.retirementAge}</Label>
                <Slider
                  className="w-full"
                  value={[params.retirementAge]}
                  min={params.currentAge}
                  max={70}
                  step={1}
                  onValueChange={([value]) =>
                    setParams((prev) => {
                      const next = Math.min(Math.max(value, prev.currentAge), 70);
                      if (next === prev.retirementAge) return prev;
                      return {
                        ...prev,
                        retirementAge: next,
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Projection End Age: {params.maxAge}</Label>
                <Slider value={[params.maxAge]} min={70} max={100} step={10} onValueChange={([v]) => setParams({ ...params, maxAge: v })} />
                <div className="text-xs text-muted-foreground">
                  Current age: {params.currentAge} · Start year: {params.startYear} · End year: {projectionEndYear}
                </div>
              </div>
              <Accordion type="single" collapsible className="pt-2">
                <AccordionItem value="returns">
                  <AccordionTrigger className="text-base font-semibold">Return & Inflation Assumptions</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Inflation</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={(params.inflation * 100).toFixed(1)}
                          onChange={(e) => setParams({ ...params, inflation: Number(e.target.value) / 100 })}
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox checked={realDollars} onCheckedChange={(v) => setRealDollars(Boolean(v))} />
                          <Label className="m-0 text-sm">Inflation-Adjusted View (today’s dollars)</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cash Yield</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={(params.cashReturn * 100).toFixed(1)}
                          onChange={(e) => setParams({ ...params, cashReturn: Number(e.target.value) / 100 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Real Estate Return (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={(params.realEstateReturn * 100).toFixed(1)}
                          onChange={(e) => setParams({ ...params, realEstateReturn: Number(e.target.value) / 100 })}
                        />
                      </div>
                      {!params.useGlidepath && (
                        <div className="space-y-2">
                          <Label>Fixed Stock Return (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={(params.stockReturn * 100).toFixed(1)}
                            onChange={(e) => setParams({ ...params, stockReturn: Number(e.target.value) / 100 })}
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
          </div>
          <div className="space-y-4">
            <Accordion type="multiple" className="pt-4">
              <AccordionItem value="starting-balances">
                <AccordionTrigger className="text-base font-semibold">Starting Balances</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Starting Cash</Label>
                      <Input type="number" value={params.cash0} onChange={(e) => setParams({ ...params, cash0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Starting Equity (Stocks)</Label>
                      <Input type="number" value={params.stocks0} onChange={(e) => setParams({ ...params, stocks0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Real Estate Value</Label>
                      <Input type="number" value={params.realEstate0} onChange={(e) => setParams({ ...params, realEstate0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Mortgage principal outstanding</Label>
                      <Input type="number" value={params.mortgage0} onChange={(e) => setParams({ ...params, mortgage0: Number(e.target.value || 0) })} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="cash">
                <AccordionTrigger className="text-base font-semibold">Cash</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Starting Cash</Label>
                      <Input type="number" value={params.cash0} onChange={(e) => setParams({ ...params, cash0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Cash Yield</Label>
                      <Input type="number" step="0.1" value={(params.cashReturn * 100).toFixed(1)} onChange={(e) => setParams({ ...params, cashReturn: Number(e.target.value) / 100 })} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="equity">
                <AccordionTrigger className="text-base font-semibold">Equity</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Starting Equity (Stocks)</Label>
                      <Input type="number" value={params.stocks0} onChange={(e) => setParams({ ...params, stocks0: Number(e.target.value || 0) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual Contribution</Label>
                      <Input type="number" value={params.contribution0} onChange={(e) => setParams({ ...params, contribution0: Number(e.target.value || 0) })} />
                      <Label>Contribution Growth per Year: {(params.contributionGrowth * 100).toFixed(1)}%</Label>
                      <Slider value={[Math.round(params.contributionGrowth * 1000)]} min={0} max={100} step={1} onValueChange={([v]) => setParams({ ...params, contributionGrowth: v / 1000 })} />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 pt-2">
                      <Checkbox checked={params.useGlidepath} onCheckedChange={(v) => setParams({ ...params, useGlidepath: Boolean(v) })} />
                      <Label className="m-0">Use Glidepath for Equity Returns</Label>
                    </div>
                    {params.useGlidepath ? (
                      <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <Label>{`Retirement age (${params.retirementAge}) − 20 =`}</Label>
                          <Input type="number" step="0.1" value={(params.gpRetMinus20 * 100).toFixed(1)} onChange={(e) => setParams({ ...params, gpRetMinus20: Number(e.target.value) / 100 })} />
                        </div>
                        <div>
                          <Label>{`Retirement age (${params.retirementAge}) − 10 =`}</Label>
                          <Input type="number" step="0.1" value={(params.gpRetMinus10 * 100).toFixed(1)} onChange={(e) => setParams({ ...params, gpRetMinus10: Number(e.target.value) / 100 })} />
                        </div>
                        <div>
                          <Label>{`Retirement age (${params.retirementAge}) − 5 =`}</Label>
                          <Input type="number" step="0.1" value={(params.gpRetMinus5 * 100).toFixed(1)} onChange={(e) => setParams({ ...params, gpRetMinus5: Number(e.target.value) / 100 })} />
                        </div>
                        <div>
                          <Label>{`Post-retirement (${params.retirementAge}) =`}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={(params.gpPostRet * 100).toFixed(1)}
                            onChange={(e) => {
                              const value = Number(e.target.value) / 100;
                              setParams({ ...params, gpPostRet: value, gpRet0: value });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <Label>Fixed Stock Return (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={(params.stockReturn * 100).toFixed(1)}
                          onChange={(e) => setParams({ ...params, stockReturn: Number(e.target.value) / 100 })}
                        />
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="real-estate">
                <AccordionTrigger className="text-base font-semibold">Real Estate</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Real Estate Value</Label>
                      <Input type="number" value={params.realEstate0} onChange={(e) => setParams({ ...params, realEstate0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Real Estate Return (%)</Label>
                      <Input type="number" step="0.1" value={(params.realEstateReturn * 100).toFixed(1)} onChange={(e) => setParams({ ...params, realEstateReturn: Number(e.target.value) / 100 })} />
                    </div>
                  </div>
                  <h3 className="font-medium pt-4">Mortgage Details</h3>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="col-span-2">
                      <Label>Mortgage principal outstanding (today)</Label>
                      <Input type="number" value={params.mortgage0} onChange={(e) => setParams({ ...params, mortgage0: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Rate (%)</Label>
                      <Input type="number" step="0.01" value={(params.mortgageRate * 100).toFixed(3)} onChange={(e) => setParams({ ...params, mortgageRate: Number(e.target.value) / 100 })} />
                    </div>
                    <div>
                      <Label>Mortgage Payment (monthly)</Label>
                      <Input type="number" value={params.mortgagePaymentMonthly} onChange={(e) => setParams({ ...params, mortgagePaymentMonthly: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Loan End Year</Label>
                      <Input type="number" value={params.mortgageEndYear} onChange={(e) => setParams({ ...params, mortgageEndYear: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <Label>Loan End Month (1-12)</Label>
                      <Input type="number" value={params.mortgageEndMonth} onChange={(e) => setParams({ ...params, mortgageEndMonth: Number(e.target.value || 0) })} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="expenses">
                <AccordionTrigger className="text-base font-semibold">Expenses</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Income Funded Expenses</h3>
                      <p className="text-sm text-muted-foreground">
                        Aim for your earned income to cover these core costs before retirement; after you retire, these will be drawn from
                        your savings.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Base Spending (monthly)</Label>
                          <Input type="number" value={params.baseMonthly} onChange={(e) => setParams({ ...params, baseMonthly: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Vacation (monthly)</Label>
                          <Input type="number" value={params.vacationMonthly} onChange={(e) => setParams({ ...params, vacationMonthly: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            Home Expenses (annual)
                            <Info className="w-4 h-4 opacity-70" aria-label="Plan for maintenance, improvements, and recurring home projects." />
                          </Label>
                          <Input type="number" value={params.homeUpgradesAnnual} onChange={(e) => setParams({ ...params, homeUpgradesAnnual: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Mortgage Payment (monthly)</Label>
                          <Input type="number" value={params.mortgagePaymentMonthly} onChange={(e) => setParams({ ...params, mortgagePaymentMonthly: Number(e.target.value || 0) })} />
                        </div>
                      </div>
                      <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
                        Annual subtotal: ${currency(incomeFundedSubtotal)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Savings Funded Expenses</h3>
                      <p className="text-sm text-muted-foreground">Customize support that will be funded from savings or portfolio withdrawals.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Parent Support Begins (year)</Label>
                          <Input type="number" value={params.parentStart} onChange={(e) => setParams({ ...params, parentStart: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Parent Support Ends (year)</Label>
                          <Input type="number" value={params.parentEndYear} onChange={(e) => setParams({ ...params, parentEndYear: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Annual Increase for Parents ($)</Label>
                          <Input type="number" value={params.parentInc} onChange={(e) => setParams({ ...params, parentInc: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Kids Cost (annual)</Label>
                          <Input type="number" value={params.kidsAnnual} onChange={(e) => setParams({ ...params, kidsAnnual: Number(e.target.value || 0) })} />
                        </div>
                        <div>
                          <Label>Kids Support Duration (years)</Label>
                          <Input type="number" value={params.kidsYears} onChange={(e) => setParams({ ...params, kidsYears: Number(e.target.value || 0) })} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Kids Start Years (comma separated)</Label>
                          <Input
                            type="text"
                            value={params.kidsStarts.join(", ")}
                            onChange={(e) => {
                              const next = e.target.value
                                .split(",")
                                .map((piece) => piece.trim())
                                .filter((piece) => piece.length > 0)
                                .map((piece) => Number(piece))
                                .filter((num) => Number.isFinite(num))
                                .sort((a, b) => a - b);
                              setParams({ ...params, kidsStarts: next });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button onClick={handleSave}>
            <Link2 className="w-4 h-4 mr-2" />
            {copyStatus === "copied" ? "Link Copied" : copyStatus === "error" ? "Copy Failed - Try Again" : "Save Scenario"}
          </Button>
          {copyStatus === "copied" && (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Link copied to clipboard.
            </span>
          )}
          {copyStatus === "error" && (
            <span className="text-sm text-destructive" aria-live="polite">
              Could not copy link. Please try again.
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: The link we create contains your data — copy or bookmark it to save your work.
          </p>
        </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold">Projected Net Worth</h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={rows.map((r) => ({
                year: r.year,
                netWorth: r.totals.netWorth * realFactor(r.year),
                stocks: r.totals.stocksEnd * realFactor(r.year),
                cash: r.totals.cashEnd * realFactor(r.year),
                realEstateEquity: (r.totals.realEstateEnd - r.totals.mortgage) * realFactor(r.year),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => `$${currency(v)}`} />
                <Legend />
                <Line type="monotone" dataKey="netWorth" name="Net Worth" dot={false} stroke={trendLineColors.netWorth} />
                <Line type="monotone" dataKey="stocks" name="Stocks" dot={false} stroke={trendLineColors.stocks} />
                <Line type="monotone" dataKey="cash" name="Cash" dot={false} stroke={trendLineColors.cash} />
                <Line
                  type="monotone"
                  dataKey="realEstateEquity"
                  name="Real Estate Equity"
                  dot={false}
                  stroke={trendLineColors.realEstateEquity}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Year-by-Year Table {realDollars && <span className="text-xs text-muted-foreground">(inflation-adjusted)</span>}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Year</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Stock %</th>
                  <th className="py-2 pr-3">Contribution</th>
                  <th className="py-2 pr-3">Income</th>
                  <th className="py-2 pr-3">Base</th>
                  <th className="py-2 pr-3">Mortgage</th>
                  <th className="py-2 pr-3">Vacation</th>
                  <th className="py-2 pr-3">Home Exp.</th>
                  <th className="py-2 pr-3">Parents</th>
                  <th className="py-2 pr-3">Kids</th>
                  <th className="py-2 pr-3">Total Expenses</th>
                  <th className="py-2 pr-3">Savings Funded Exp.</th>
                  <th className="py-2 pr-3">Stocks End</th>
                  <th className="py-2 pr-3">Cash End</th>
                  <th className="py-2 pr-3">RE (Value)</th>
                  <th className="py-2 pr-3">Mortgage</th>
                  <th className="py-2 pr-3">Net Worth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = realFactor(r.year);
                  return (
                    <tr key={r.year} className="border-b last:border-0">
                      <td className="py-2 pr-3">{r.year}</td>
                      <td className="py-2 pr-3">{r.age}</td>
                      <td className="py-2 pr-3">{(r.stockReturnApplied * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3">${currency(r.contribution * f)}</td>
                      <td className="py-2 pr-3">${currency(r.income * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.base * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.mortgage * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.vacation * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.upgrades * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.parents * f)}</td>
                      <td className="py-2 pr-3">${currency(r.expenses.kids * f)}</td>
                      <td className="py-2 pr-3 font-medium">${currency(r.totals.totalExpenses * f)}</td>
                      <td className="py-2 pr-3">${currency(r.totals.savingsFundedExpenses * f)}</td>
                      <td className="py-2 pr-3 font-medium">${currency(r.totals.stocksEnd * f)}</td>
                      <td className="py-2 pr-3">${currency(r.totals.cashEnd * f)}</td>
                      <td className="py-2 pr-3">${currency(r.totals.realEstateEnd * f)}</td>
                      <td className="py-2 pr-3">${currency(r.totals.mortgage * f)}</td>
                      <td className="py-2 pr-3 font-semibold">${currency(r.totals.netWorth * f)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
