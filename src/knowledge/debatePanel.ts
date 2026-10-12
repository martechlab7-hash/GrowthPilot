/**
 * The hypothesis stress-test panel. Each challenger is a devil's advocate with
 * one lens, drawn as a mascot so the debate is easy to follow. Pilot (the
 * user's chosen mascot) defends with evidence; the Judge rules.
 */
export interface Panelist {
  id: string;
  name: string;
  role: string;
  /** Mascot character id (see components/mascot/registry). */
  character: string;
  /** What this challenger always pushes on. */
  lens: string;
}

export const CHALLENGERS: Panelist[] = [
  { id: "data_skeptic", name: "Dev", role: "Data skeptic", character: "glasses", lens: "Is the change real or a tracking, definition or data-quality artefact? Is the sample big enough? Correlation is not causation." },
  { id: "statistician", name: "Cogs", role: "Statistician", character: "clockwork", lens: "Seasonality, regression to the mean, mix shift and base effects. Would the pattern appear in last year's data too?" },
  { id: "finance", name: "Farah", role: "Finance chief", character: "hijabi", lens: "Does the size of this driver explain the size of the revenue change? Is it material, and what does it cost to fix?" },
  { id: "customer", name: "Granny Rose", role: "Voice of the customer", character: "granny", lens: "Would a real customer describe it this way? What are customers actually experiencing: price, product, service, trust?" },
  { id: "competitor", name: "Harjit", role: "Market watcher", character: "sikh", lens: "What did competitors, new entrants or the wider market do at the same time? Is this the whole category, not just us?" },
  { id: "operator", name: "Bob", role: "Operations lead", character: "builder", lens: "Did something change in operations, product, pricing rules, inventory, service levels or the website/app?" },
  { id: "contrarian", name: "Captain Flip", role: "Contrarian", character: "pirate", lens: "Argue the opposite: what if the cause is the reverse, or a completely different driver nobody has mentioned?" },
];

export const JUDGE: Panelist = {
  id: "judge", name: "The Judge", role: "Weighs both sides", character: "wizard",
  lens: "Rules on whether the hypothesis survives, and names the single test or dataset that would settle it.",
};

export function getPanelist(id: string): Panelist | undefined {
  return [...CHALLENGERS, JUDGE].find((p) => p.id === id);
}

/** The same panel, with lenses for stress-testing a strategy rather than a diagnosis. */
export const STRATEGY_CHALLENGERS: Panelist[] = [
  { ...CHALLENGERS[0]!, lens: "Is the evidence real? Is the baseline measured, or are we planning on numbers nobody has checked?" },
  { ...CHALLENGERS[1]!, lens: "Will we be able to tell whether it worked: control groups, sample size, seasonality and incrementality?" },
  { ...CHALLENGERS[2]!, lens: "Payback, margin and budget realism. Is this the best use of the money, and what if it underdelivers?" },
  { ...CHALLENGERS[3]!, lens: "Would real customers notice, care and respond? Does it fit how they actually discover and buy?" },
  { ...CHALLENGERS[4]!, lens: "How will competitors respond? Is it differentiated, or easy to copy and outspend?" },
  { ...CHALLENGERS[5]!, lens: "Can this team deliver it with its current capacity, tools, approvals and timeline?" },
  { ...CHALLENGERS[6]!, lens: "Argue the opposite: what different plan would beat this one with the same money and people?" },
];
