/**
 * Minimal ambient declaration for Node's built-in SQLite module (Node >= 22.5).
 * Used only by the vitest repository tests (never bundled into the app), so we
 * declare just the surface we consume instead of pulling in @types/node, which
 * conflicts with React Native's global types.
 */
declare module 'node:sqlite' {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }

  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
