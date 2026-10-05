import { apiFetch } from '../apiClient';
import {
  Vacation,
  VacationExpenseItem,
  VacationLoggedExpense,
  VacationChipIn,
  VacationTransactionLog,
  PastVacationSummary
} from '../../types';

export interface VacationDetailResponse {
  vacation: Vacation;
  expenseItems: VacationExpenseItem[];
  loggedExpenses: VacationLoggedExpense[];
  chipIns: VacationChipIn[];
  logs: VacationTransactionLog[];
}

export const vacationApi = {
  createVacation: async (name: string, description?: string): Promise<Vacation> => {
    const res = await apiFetch<{ vacation: Vacation }>('/api/vacations', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
    return res.vacation;
  },

  joinVacation: async (joinCode: string): Promise<Vacation> => {
    const res = await apiFetch<{ vacation: Vacation }>('/api/vacations/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode })
    });
    return res.vacation;
  },

  getActiveVacations: async (): Promise<Vacation[]> => {
    const res = await apiFetch<{ vacations: Vacation[] }>('/api/vacations');
    return res.vacations;
  },

  getPastVacations: async (): Promise<Vacation[]> => {
    const res = await apiFetch<{ vacations: Vacation[] }>('/api/vacations/past');
    return res.vacations;
  },

  getVacationById: async (id: string): Promise<VacationDetailResponse> => {
    return apiFetch<VacationDetailResponse>(`/api/vacations/${id}`);
  },

  getPastVacationSummary: async (id: string): Promise<PastVacationSummary> => {
    return apiFetch<PastVacationSummary>(`/api/vacations/${id}/past-summary`);
  },

  deposit: async (
    vacationId: string,
    amountCentavos: number,
    fromAccountId: string,
    notes?: string
  ): Promise<{ success: boolean; vacation: Vacation; log: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; vacation: Vacation; log: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/deposit`,
      {
        method: 'POST',
        body: JSON.stringify({ amountCentavos, fromAccountId, notes })
      }
    );
  },

  createExpenseItem: async (
    vacationId: string,
    title: string,
    amountCentavos: number,
    category?: string,
    notes?: string,
    deductionSource?: 'pool' | 'chip_in',
    chipInId?: string | null
  ): Promise<{ success: boolean; expenseItem: VacationExpenseItem; vacation: Vacation; log: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; expenseItem: VacationExpenseItem; vacation: Vacation; log: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/expense-items`,
      {
        method: 'POST',
        body: JSON.stringify({ title, amountCentavos, category, notes, deductionSource, chipInId })
      }
    );
  },

  logPersonalExpense: async (
    vacationId: string,
    title: string,
    amountCentavos: number,
    fromAccountId?: string,
    category?: string,
    notes?: string
  ): Promise<{ success: boolean; loggedExpense: VacationLoggedExpense }> => {
    return apiFetch<{ success: boolean; loggedExpense: VacationLoggedExpense }>(
      `/api/vacations/${vacationId}/logged-expenses`,
      {
        method: 'POST',
        body: JSON.stringify({ title, amountCentavos, fromAccountId, category, notes })
      }
    );
  },

  createChipIn: async (
    vacationId: string,
    title: string,
    targetAmountCentavos?: number | null,
    description?: string
  ): Promise<{ success: boolean; chipIn: VacationChipIn }> => {
    return apiFetch<{ success: boolean; chipIn: VacationChipIn }>(
      `/api/vacations/${vacationId}/chip-ins`,
      {
        method: 'POST',
        body: JSON.stringify({ title, targetAmountCentavos, description })
      }
    );
  },

  contributeChipIn: async (
    vacationId: string,
    chipInId: string,
    amountCentavos: number,
    fromAccountId: string,
    notes?: string
  ): Promise<{ success: boolean; chipIn: VacationChipIn; vacation: Vacation; log: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; chipIn: VacationChipIn; vacation: Vacation; log: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/chip-ins/${chipInId}/contribute`,
      {
        method: 'POST',
        body: JSON.stringify({ amountCentavos, fromAccountId, notes })
      }
    );
  },

  refund: async (
    vacationId: string,
    memberUserId: string,
    amountCentavos: number,
    toAccountId?: string,
    notes?: string,
    refundSource?: 'pool' | 'chip_in',
    chipInId?: string | null
  ): Promise<{ success: boolean; vacation: Vacation; chipIn?: VacationChipIn; log: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; vacation: Vacation; chipIn?: VacationChipIn; log: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({ memberUserId, amountCentavos, toAccountId, notes, refundSource, chipInId })
      }
    );
  },

  reverseLog: async (
    vacationId: string,
    originalLogId: string,
    reason: string
  ): Promise<{ success: boolean; vacation: Vacation; reversingLog: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; vacation: Vacation; reversingLog: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/reversal`,
      {
        method: 'POST',
        body: JSON.stringify({ originalLogId, reason })
      }
    );
  },

  conclude: async (
    vacationId: string
  ): Promise<{ success: boolean; vacation: Vacation; log: VacationTransactionLog }> => {
    return apiFetch<{ success: boolean; vacation: Vacation; log: VacationTransactionLog }>(
      `/api/vacations/${vacationId}/conclude`,
      {
        method: 'POST'
      }
    );
  }
};
