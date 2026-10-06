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
] as const;

export type MascotId = (typeof MASCOTS)[number]["id"] | "none";
export const MASCOT_IDS: string[] = [...MASCOTS.map((m) => m.id), "none"];
export const DEFAULT_MASCOT: MascotId = "owl";

export function mascotSheets(id: string) {
  const known = MASCOTS.some((m) => m.id === id) ? id : DEFAULT_MASCOT;
  return { directions: `/mascot/${known}-directions.webp`, reactions: `/mascot/${known}-reactions.webp` };
}
