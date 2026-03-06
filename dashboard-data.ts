import { App, TFile, normalizePath } from "obsidian";
import { ParsedWikiLink, loadIndexLinks } from "./utils";

interface CacheEntry {
  mtime: number;
  links: ParsedWikiLink[];
}

/**
 * Data access layer for dashboard sections.
 * Caches parsed index-note links and invalidates by file mtime.
 */
export class DashboardDataStore {
  private readonly app: App;
  private readonly indexCache = new Map<string, CacheEntry>();

  constructor(app: App) {
    this.app = app;
  }

  clearAllCaches() {
    this.indexCache.clear();
  }

  invalidatePath(path: string) {
    this.indexCache.delete(normalizePath(path));
  }

  async getLinksForIndexNote(notePath: string): Promise<ParsedWikiLink[]> {
    const normalizedPath = normalizePath(notePath);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!(file instanceof TFile) || file.extension !== "md") {
      this.indexCache.delete(normalizedPath);
      return [];
    }

    const mtime = file.stat.mtime;
    const cached = this.indexCache.get(normalizedPath);
    if (cached && cached.mtime === mtime) {
      return cached.links;
    }

    const links = await loadIndexLinks(this.app, normalizedPath);
    this.indexCache.set(normalizedPath, { mtime, links });
    return links;
  }

  async getSectionLinks(indexNotes: Record<string, string>): Promise<Map<string, ParsedWikiLink[]>> {
    const entries = Object.entries(indexNotes);
    const loaded = await Promise.all(
      entries.map(async ([section, notePath]) => {
        const links = await this.getLinksForIndexNote(notePath);
        return [section, links] as const;
      })
    );

    return new Map(loaded);
  }
}
