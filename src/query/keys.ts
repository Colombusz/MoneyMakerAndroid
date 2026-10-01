/**
 * Barrel for the per-feature query-key factories. Components and hooks must use
 * these factories (never inline arrays) so keys stay consistent across reads,
 * writes and invalidation.
 */
export { accountKeys } from '../features/accounts/keys';
export { categoryKeys } from '../features/categories/keys';
export { transactionKeys } from '../features/transactions/keys';
export { goalKeys } from '../features/goals/keys';
export { recurringKeys } from '../features/recurring/keys';
export { dayNoteKeys } from '../features/calendar/keys';
export { partnerKeys, sharedGoalKeys } from '../features/partner/keys';
