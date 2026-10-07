/** Characters from page-mascot (MIT, Kamran Ahmed). Sheets live in /public/mascot. */
export const MASCOTS = [
  { id: "owl", name: "Owl" },
  { id: "fox", name: "Fox" },
  { id: "robot", name: "Robot" },
  { id: "droid", name: "Droid" },
  { id: "panda", name: "Panda" },
  { id: "penguin", name: "Penguin" },
  { id: "cat", name: "Cat" },
  { id: "bear", name: "Bear" },
  { id: "otter", name: "Otter" },
  { id: "koala", name: "Koala" },
  { id: "redpanda", name: "Red panda" },
  { id: "tiger", name: "Tiger" },
  { id: "bunny", name: "Bunny" },
  { id: "frog", name: "Frog" },
  { id: "hamster", name: "Hamster" },
  { id: "scientist", name: "Scientist" },
  { id: "astronaut", name: "Astronaut" },
  { id: "wizard", name: "Wizard" },
  { id: "knight", name: "Knight" },
  { id: "chef", name: "Chef" },
  // People and things (also used as the hypothesis debate panel)
  { id: "ballerina", name: "Ballerina" },
  { id: "beard", name: "Beard" },
  { id: "builder", name: "Builder" },
  { id: "cap", name: "Cap" },
  { id: "afro", name: "Curls" },
  { id: "bald", name: "Bald" },
  { id: "grandpa", name: "Grandpa" },
  { id: "granny", name: "Granny" },
  { id: "hijabi", name: "Hijabi" },
  { id: "glasses", name: "Glasses" },
  { id: "nurse", name: "Nurse" },
  { id: "pirate", name: "Pirate" },
  { id: "sikh", name: "Sikh" },
  { id: "skater", name: "Skater" },
  { id: "clockwork", name: "Clockwork" },
  { id: "crt", name: "Monitor" },
] as const;

export type MascotId = (typeof MASCOTS)[number]["id"] | "none";
export const MASCOT_IDS: string[] = [...MASCOTS.map((m) => m.id), "none"];
export const DEFAULT_MASCOT: MascotId = "owl";

export function mascotSheets(id: string) {
  const known = MASCOTS.some((m) => m.id === id) ? id : DEFAULT_MASCOT;
  return { directions: `/mascot/${known}-directions.webp`, reactions: `/mascot/${known}-reactions.webp` };
}
