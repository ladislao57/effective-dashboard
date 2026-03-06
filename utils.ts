import { App, TAbstractFile, TFile, normalizePath } from "obsidian";

export const HABIT_KEYS = [
  "warmup",
  "yoga",
  "meditation",
  "training",
  "english",
  "study",
  "energy",
  "mood",
  "clarity",
  "day_score",
  "sleep_quality"
] as const;

export type HabitKey = (typeof HABIT_KEYS)[number];

export interface HabitProgress {
  key: HabitKey;
  values: number[];
  average: number;
}

export interface ParsedWikiLink {
  target: string;
  display: string;
}

/**
 * Extract wiki links from markdown text.
 * Supports [[Target]], [[Target|Alias]], [[Target#Heading|Alias]].
 */
export function parseWikiLinks(markdown: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  const seen = new Set<string>();
  const regex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const inner = match[1]?.trim();
    if (!inner) continue;

    const [rawTarget, rawAlias] = inner.split("|");
    const target = (rawTarget ?? "").split("#")[0].trim();
    if (!target) continue;

    if (seen.has(target)) continue;
    seen.add(target);

    links.push({
      target,
      display: (rawAlias ?? target).trim() || target
    });
  }

  return links;
}

export async function loadIndexLinks(app: App, notePath: string): Promise<ParsedWikiLink[]> {
  const resolvedPath = normalizePath(notePath);
  const file = app.vault.getAbstractFileByPath(resolvedPath);
  if (!(file instanceof TFile) || file.extension !== "md") {
    return [];
  }

  const content = await app.vault.cachedRead(file);
  return parseWikiLinks(content);
}

export function findFileByLink(app: App, link: string): TFile | null {
  return app.metadataCache.getFirstLinkpathDest(link, "") ?? null;
}

export function getDailyFileForDate(app: App, folder: string, date: Date): TFile | null {
  const name = toDailyFileName(date);
  const path = normalizePath(folder ? `${folder}/${name}` : name);
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

export function toDailyFileName(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}.md`;
}

export async function getWeeklyHabitProgress(
  app: App,
  dailyFolder: string
): Promise<HabitProgress[]> {
  const dates = lastNDates(7);
  const perHabitValues = new Map<HabitKey, number[]>();
  HABIT_KEYS.forEach((habit) => perHabitValues.set(habit, []));

  for (const date of dates) {
    const file = getDailyFileForDate(app, dailyFolder, date);
    const frontmatter = file ? app.metadataCache.getFileCache(file)?.frontmatter ?? {} : {};

    HABIT_KEYS.forEach((habit) => {
      const raw = frontmatter[habit];
      const numeric = toScore(raw);
      perHabitValues.get(habit)?.push(numeric);
    });
  }

  return HABIT_KEYS.map((habit) => {
    const values = perHabitValues.get(habit) ?? [];
    const average = values.length
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;

    return { key: habit, values, average };
  });
}

function toScore(value: unknown): number {
  if (typeof value === "number") return clamp(value, 0, 10);
  if (typeof value === "boolean") return value ? 10 : 0;

  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (["yes", "true", "done"].includes(lower)) return 10;
    if (["no", "false", "skip"].includes(lower)) return 0;

    const parsed = Number(lower);
    if (!Number.isNaN(parsed)) return clamp(parsed, 0, 10);
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function startOfWeek(date = new Date()): Date {
  const clone = new Date(date);
  const day = clone.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  clone.setDate(clone.getDate() + offset);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function lastNDates(count: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    dates.push(date);
  }

  return dates;
}

export async function ensureFolderPath(app: App, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath).trim();
  if (!normalized) return;

  const segments = normalized.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing: TAbstractFile | null = app.vault.getAbstractFileByPath(current);
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
}
