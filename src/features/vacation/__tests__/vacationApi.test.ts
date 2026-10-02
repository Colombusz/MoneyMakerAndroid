import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vacationApi } from '../../../services/api/vacationApi';
import * as apiClient from '../../../services/apiClient';

vi.mock('../../../services/apiClient', () => ({
  apiFetch: vi.fn()
}));

describe('vacationApi (Android)', () => {
  const mockApiFetch = vi.mocked(apiClient.apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createVacation sends POST /api/vacations', async () => {
    const mockVacation = {
      _id: 'vac-1',
      name: 'Boracay Trip',
      joinCode: 'BORA26',
      status: 'active' as const,
      balanceCentavos: 0,
      masterUserId: 'u1',
      members: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    };
    mockApiFetch.mockResolvedValueOnce({ vacation: mockVacation });

    const result = await vacationApi.createVacation('Boracay Trip', 'Summer beach vacation');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Boracay Trip', description: 'Summer beach vacation' })
    });
    expect(result).toEqual(mockVacation);
  });

  it('joinVacation sends POST /api/vacations/join', async () => {
    const mockVacation = {
      _id: 'vac-1',
      name: 'Boracay Trip',
      joinCode: 'BORA26',
      status: 'active' as const,
      balanceCentavos: 0,
      masterUserId: 'u1',
      members: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    };
    mockApiFetch.mockResolvedValueOnce({ vacation: mockVacation });

    const result = await vacationApi.joinVacation('BORA26');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode: 'BORA26' })
    });
    expect(result).toEqual(mockVacation);
  });

  it('getActiveVacations and getPastVacations call correct endpoints', async () => {
    mockApiFetch.mockResolvedValueOnce({ vacations: [{ _id: 'vac-1', status: 'active' }] });
    const active = await vacationApi.getActiveVacations();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations');
    expect(active).toHaveLength(1);

    mockApiFetch.mockResolvedValueOnce({ vacations: [{ _id: 'vac-2', status: 'concluded' }] });
    const past = await vacationApi.getPastVacations();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/past');
    expect(past).toHaveLength(1);
  });

  it('deposit sends POST with centavos and fromAccountId', async () => {
    const mockResponse = {
      success: true,
      vacation: { _id: 'vac-1', balanceCentavos: 500000 },
      log: { _id: 'log-1', type: 'deposit', amountCentavos: 500000 }
    };
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await vacationApi.deposit('vac-1', 500000, 'acc-1', 'Initial pool fund');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/deposit', {
      method: 'POST',
      body: JSON.stringify({ amountCentavos: 500000, fromAccountId: 'acc-1', notes: 'Initial pool fund' })
    });
    expect(result.success).toBe(true);
    expect(result.vacation.balanceCentavos).toBe(500000);
  });

  it('createExpenseItem sends POST /api/vacations/:id/expense-items', async () => {
    const mockResponse = {
      success: true,
      expenseItem: { _id: 'exp-1', title: 'Hotel booking', amountCentavos: 250000 },
      vacation: { _id: 'vac-1', balanceCentavos: 250000 },
      log: { _id: 'log-2', type: 'expense', amountCentavos: 250000 }
    };
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await vacationApi.createExpenseItem('vac-1', 'Hotel booking', 250000, 'Accommodation');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/expense-items', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hotel booking', amountCentavos: 250000, category: 'Accommodation', notes: undefined })
    });
    expect(result.expenseItem.title).toBe('Hotel booking');
  });

  it('createExpenseItem supports deduction source from chip-in item', async () => {
    const mockResponse = {
      success: true,
      expenseItem: { _id: 'exp-2', title: 'Boat rental', amountCentavos: 80000, deductionSource: 'chip_in', chipInId: 'chip-1' },
      vacation: { _id: 'vac-1', balanceCentavos: 250000 },
      log: { _id: 'log-3', type: 'expense', amountCentavos: 80000 }
    };
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await vacationApi.createExpenseItem('vac-1', 'Boat rental', 80000, 'Transportation', 'Paid from boat pool', 'chip_in', 'chip-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/expense-items', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Boat rental',
        amountCentavos: 80000,
        category: 'Transportation',
        notes: 'Paid from boat pool',
        deductionSource: 'chip_in',
        chipInId: 'chip-1'
      })
    });
    expect(result.expenseItem.deductionSource).toBe('chip_in');
    expect(result.expenseItem.chipInId).toBe('chip-1');
  });

  it('logPersonalExpense sends POST with chosen fromAccountId', async () => {
    const mockResponse = {
      success: true,
      loggedExpense: { _id: 'lexp-1', title: 'Coffee souvenir', amountCentavos: 35000, fromAccountId: 'acc-1' }
    };
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await vacationApi.logPersonalExpense('vac-1', 'Coffee souvenir', 35000, 'acc-1', 'Food & Dining');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/logged-expenses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Coffee souvenir', amountCentavos: 35000, fromAccountId: 'acc-1', category: 'Food & Dining', notes: undefined })
    });
    expect(result.loggedExpense.amountCentavos).toBe(35000);
  });

  it('createChipIn and contributeChipIn send correct requests', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      chipIn: { _id: 'chip-1', title: 'Scuba diving', targetAmountCentavos: 100000, currentAmountCentavos: 0 }
    });

    await vacationApi.createChipIn('vac-1', 'Scuba diving', 100000);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/chip-ins', {
      method: 'POST',
      body: JSON.stringify({ title: 'Scuba diving', targetAmountCentavos: 100000, description: undefined })
    });

    mockApiFetch.mockResolvedValueOnce({
      success: true,
      chipIn: { _id: 'chip-1', totalCollectedCentavos: 50000 },
      vacation: { _id: 'vac-1', balanceCentavos: 300000 },
      log: { _id: 'log-3', type: 'chip_in_contribution', amountCentavos: 50000 }
    });

    const contRes = await vacationApi.contributeChipIn('vac-1', 'chip-1', 50000, 'acc-1', 'Contributed for scuba');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/chip-ins/chip-1/contribute', {
      method: 'POST',
      body: JSON.stringify({ amountCentavos: 50000, fromAccountId: 'acc-1', notes: 'Contributed for scuba' })
    });
    expect(contRes.chipIn.totalCollectedCentavos).toBe(50000);
  });

  it('refund sends POST with target member and amount', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      vacation: { _id: 'vac-1', balanceCentavos: 0 },
      log: { _id: 'log-4', type: 'refund', amountCentavos: 50000 }
    });

    const refRes = await vacationApi.refund('vac-1', 'u2', 50000, 'acc-2', 'Leftover refund');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/refund', {
      method: 'POST',
      body: JSON.stringify({ memberUserId: 'u2', amountCentavos: 50000, toAccountId: 'acc-2', notes: 'Leftover refund' })
    });
    expect(refRes.success).toBe(true);

    // Refund from chip-in source
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      vacation: { _id: 'vac-1', balanceCentavos: 0 },
      chipIn: { _id: 'ci-1', totalRefundedCentavos: 20000 },
      log: { _id: 'log-4b', type: 'refund', amountCentavos: 20000 }
    });

    const refChipRes = await vacationApi.refund(
      'vac-1',
      'u2',
      20000,
      undefined,
      'Leftover boat refund',
      'chip_in',
      'ci-1'
    );
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/refund', {
      method: 'POST',
      body: JSON.stringify({
        memberUserId: 'u2',
        amountCentavos: 20000,
        notes: 'Leftover boat refund',
        refundSource: 'chip_in',
        chipInId: 'ci-1'
      })
    });
    expect(refChipRes.success).toBe(true);
  });

  it('conclude sends POST /api/vacations/:id/conclude', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      vacation: { _id: 'vac-1', status: 'concluded', balanceCentavos: 0 },
      log: { _id: 'log-5', type: 'reversal' }
    });

    const concRes = await vacationApi.conclude('vac-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/conclude', {
      method: 'POST'
    });
    expect(concRes.vacation.status).toBe('concluded');
  });

  it('getPastVacationSummary fetches member-isolated past summary and shared expenses', async () => {
    const mockSummary = {
      vacation: {
        _id: 'vac-1',
        name: 'Past Trip',
        joinCode: 'PAST26',
        creatorUserId: 'u1',
        status: 'concluded' as const,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      sharedExpenses: [
        {
          _id: 'se-1',
          vacationId: 'vac-1',
          createdByUserId: 'u1',
          createdByName: 'Alice',
          title: 'Resort Booking',
          amountCentavos: 100000,
          category: 'Accommodation',
          deductionSource: 'pool' as const,
          date: '2026-10-01T00:00:00.000Z',
          createdAt: '2026-10-01T00:00:00.000Z'
        }
      ],
      myLoggedExpenses: [],
      myChipIns: [],
      summary: {
        totalSharedExpensesCentavos: 100000,
        myLoggedExpensesCentavos: 50000,
        myChipInContributionsCentavos: 100000,
        myDepositsCentavos: 0,
        myRefundsCentavos: 20000,
        myTotalSpentCentavos: 130000
      }
    };
    mockApiFetch.mockResolvedValueOnce(mockSummary);

    const summary = await vacationApi.getPastVacationSummary('vac-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/vacations/vac-1/past-summary');
    expect(summary.sharedExpenses.length).toBe(1);
    expect(summary.summary.totalSharedExpensesCentavos).toBe(100000);
    expect(summary.summary.myTotalSpentCentavos).toBe(130000);
  });
});
