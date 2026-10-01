import type { AppDatabase } from '../dbTypes';

export interface Migration {
  version: number;
  name: string;
  up: (db: AppDatabase) => void;
}
