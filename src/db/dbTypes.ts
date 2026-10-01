/**
 * The subset of the `expo-sqlite` database API that our repositories use.
 *
 * Declaring it structurally lets us inject a Node-backed database (node:sqlite)
 * in tests while production keeps using `expo-sqlite` unchanged. `expo-sqlite`'s
 * `SQLiteDatabase` already satisfies this shape.
 */
export interface AppDatabase {
  execSync(sql: string): void;
  runSync<T = unknown>(sql: string, params?: unknown[]): T;
  getAllSync<T = unknown>(sql: string, params?: unknown[]): T[];
  getFirstSync<T = unknown>(sql: string, params?: unknown[]): T | null;
  runAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  getAllAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
}
