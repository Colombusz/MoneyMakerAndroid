export type AccountType = 'savings' | 'payroll' | 'goals' | 'cash' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type OverrideStatus = 'skipped' | 'paid' | 'modified';
export type MemberRole = 'owner' | 'member';
export type MemberStatus = 'active' | 'left';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  currency: string;
  partner?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  startingBalanceCentavos: number;
  currentBalanceCentavos: number;
  isArchived: boolean;
  updatedAt: number; // millisecond timestamp
  deletedAt?: number | null;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amountCentavos: number;
  categoryId?: string | null;
  source?: string | null;
  destinationAccountId?: string | null;
  date: number; // epoch ms
  notes?: string;
  receiptImageUrl?: string | null;
  receiptPublicId?: string | null;
  recurringRuleId?: string | null;
  recurringOccurrenceDate?: number | null;
  goalId?: string | null;
  sharedAccountId?: string | null;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface DayNote {
  id: string;
  userId: string;
  /** UTC midnight of the calendar day this note belongs to. */
  date: number; // epoch ms
  notes: string;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface RecurringRule {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: 'expense' | 'income';
  amountCentavos: number;
  frequency: RecurringFrequency;
  intervalDays?: number | null;
  startDate: number; // epoch ms
  endDate?: number | null;
  maxOccurrences?: number | null;
  notes?: string;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface RecurringOverride {
  id: string;
  userId: string;
  recurringRuleId: string;
  occurrenceDate: number; // epoch ms
  status: OverrideStatus;
  overrideAmountCentavos?: number | null;
  transactionId?: string | null;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmountCentavos: number;
  targetDate?: number | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  linkedAccountId?: string | null;
  isShared: boolean;
  sharedGoalId?: string | null;
  totalSavedCentavos?: number;
  remainingCentavos?: number;
  percentage?: number;
  projectedCompletionDate?: string | null;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface GoalContribution {
  id: string;
  userId: string;
  goalId?: string | null;
  sharedGoalId?: string | null;
  amountCentavos: number;
  transactionId?: string | null;
  date: number;
  notes?: string;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface SharedGoalMember {
  userId: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  totalContributedCentavos: number;
}

export interface SharedGoalContributionItem {
  id: string;
  userId: string;
  contributorName: string;
  amountCentavos: number;
  date: string;
  notes?: string;
}

export interface SharedGoal {
  id: string;
  name: string;
  targetAmountCentavos: number;
  targetDate?: string | null;
  imageUrl?: string | null;
  createdByUserId: string;
  isArchived: boolean;
  totalSavedCentavos: number;
  remainingCentavos: number;
  percentage: number;
  members: SharedGoalMember[];
  recentContributions: SharedGoalContributionItem[];
  updatedAt: string;
}

export interface SyncOutboxItem {
  id: string;
  entityType:
    | 'accounts'
    | 'categories'
    | 'transactions'
    | 'recurringRules'
    | 'recurringOverrides'
    | 'goals'
    | 'goalContributions'
    | 'dayNotes';
  entityId: string;
  action: 'upsert' | 'delete';
  payloadJson: string;
  createdAt: number;
  attempts: number;
  lastError?: string | null;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
