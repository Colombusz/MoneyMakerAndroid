export interface SharedAccountMemberTotal {
  userId: string;
  name: string;
  totalDepositedCentavos: number;
  totalSpentCentavos: number;
}

export interface SharedAccountMovement {
  id: string;
  type: 'deposit' | 'expense';
  userId: string;
  userName?: string;
  amountCentavos: number;
  date: string;
  notes?: string;
  fundingAccountId?: string | null;
  fundingAccountName?: string | null;
}

export interface SharedAccount {
  id: string;
  name: string;
  balanceCentavos: number;
  members: SharedAccountMemberTotal[];
  recentMovements: SharedAccountMovement[];
  updatedAt?: string;
}

const toNum = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const toStr = (v: unknown, fb = ''): string =>
  typeof v === 'string' ? v : fb;

export function normSharedAccountMovement(raw: any, idx: number): SharedAccountMovement {
  return {
    id: toStr(raw?.id ?? raw?._id, `mov-${idx}`),
    type: raw?.type === 'expense' ? 'expense' : 'deposit',
    userId: toStr(raw?.userId),
    userName: raw?.userName ?? raw?.contributorName,
    amountCentavos: toNum(raw?.amountCentavos ?? raw?.amount),
    date: toStr(raw?.date, new Date().toISOString()),
    notes: raw?.notes,
    fundingAccountId: raw?.fundingAccountId ?? raw?.privateAccountId ?? null,
    fundingAccountName: raw?.fundingAccountName ?? raw?.privateAccountName ?? null,
  };
}

export function normSharedAccount(raw: any, idx: number): SharedAccount {
  const mSrc: any[] = Array.isArray(raw?.members)
    ? raw.members
    : Array.isArray(raw?.memberTotals)
      ? raw.memberTotals
      : [];
  const movSrc: any[] = Array.isArray(raw?.recentMovements)
    ? raw.recentMovements
    : Array.isArray(raw?.movements)
      ? raw.movements
      : [];
  return {
    id: toStr(raw?.id ?? raw?._id, `shared-acct-${idx}`),
    name: toStr(raw?.name, 'Shared account'),
    balanceCentavos: toNum(
      raw?.balanceCentavos ?? raw?.balance ?? raw?.currentBalanceCentavos
    ),
    members: mSrc.map((m: any) => ({
      userId: toStr(m?.userId),
      name: toStr(m?.name, 'Member'),
      totalDepositedCentavos: toNum(
        m?.totalDepositedCentavos ?? m?.depositedCentavos ?? m?.totalContributedCentavos
      ),
      totalSpentCentavos: toNum(m?.totalSpentCentavos ?? m?.spentCentavos),
    })),
    recentMovements: movSrc.map(normSharedAccountMovement),
    updatedAt:
      typeof raw?.updatedAt === 'string'
        ? raw.updatedAt
        : raw?.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : undefined,
  };
}

export function normSharedAccountList(data: any): SharedAccount[] {
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.sharedAccounts)
      ? data.sharedAccounts
      : Array.isArray(data?.accounts)
        ? data.accounts
        : [];
  return list.map(normSharedAccount);
}

export const isNotFoundError = (err: unknown): boolean =>
  /404|not found|cannot get/i.test(err instanceof Error ? err.message : String(err ?? ''));
