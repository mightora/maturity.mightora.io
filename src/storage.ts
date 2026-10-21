import { clone, LIMITS, type Workspace } from "./model.ts";
import { validate } from "./engine.ts";
const KEY = "mightora:maturity:workspace:v2";
async function db() {
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("mightora-maturity", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function validateWorkspace(raw: any): Workspace {
  if (
    !raw ||
    raw.version !== 2 ||
    !Array.isArray(raw.projects) ||
    raw.projects.length > LIMITS.projects
  )
    throw new Error("Invalid local workspace.");
  const projects = raw.projects.map(validate);
  if (new Set(projects.map((p: any) => p.id)).size !== projects.length)
    throw new Error("Duplicate local assessment IDs.");
  return {
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
    version: 2,
    activeId: projects.some((p: any) => p.id === raw.activeId)
      ? raw.activeId
      : (projects[0]?.id ?? ""),
    projects,
  };
}
export async function loadWorkspace(): Promise<Workspace> {
  let stored: Workspace | undefined;
  try {
    const database = await db();
    const v = await new Promise<any>((resolve, reject) => {
      const t = database.transaction("state", "readonly");
      const r = t.objectStore("state").get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      t.oncomplete = () => database.close();
    });
    if (v) stored = validateWorkspace(v);
  } catch {
    /* File URLs and private browsing may limit IndexedDB. */
  }
  let fallback: Workspace | undefined;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) fallback = validateWorkspace(JSON.parse(raw));
  } catch {
    if (!stored)
      throw new Error(
        "Local workspace is unavailable. Import a complete JSON backup.",
      );
  }
  if (
    fallback &&
    (!stored || (fallback.updatedAt ?? 0) >= (stored.updatedAt ?? 0))
  )
    return fallback;
  return stored ?? { version: 2, activeId: "", projects: [] };
}
export async function saveWorkspace(w: Workspace): Promise<string> {
  const value = clone(w);
  try {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const t = database.transaction("state", "readwrite");
      t.objectStore("state").put(value, KEY);
      t.oncomplete = () => {
        database.close();
        resolve();
      };
      t.onerror = () => {
        database.close();
        reject(t.error);
      };
      t.onabort = () => reject(t.error);
    });
    return "Saved locally in IndexedDB";
  } catch {
    localStorage.setItem(KEY, JSON.stringify(value));
    return "Saved locally in browser storage";
  }
}
export async function clearWorkspace() {
  try {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const t = database.transaction("state", "readwrite");
      t.objectStore("state").clear();
      t.oncomplete = () => {
        database.close();
        resolve();
      };
      t.onerror = () => reject(t.error);
    });
  } finally {
    localStorage.removeItem(KEY);
    localStorage.removeItem("mightora:maturity:v1");
  }
}
