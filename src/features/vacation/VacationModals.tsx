import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography } from '../../shared/theme/tokens';
import { Account, Vacation, VacationChipIn, VacationTransactionLog, PastVacationSummary } from '../../types';
import { formatCentavos, parseToCentavos } from '../../shared/utils/currency';
import { Modal, AmountInput, TextInput, Select, Button } from '../../shared/components/ui';

// =========================================================================
// 1. Create Vacation Modal
// =========================================================================
export interface CreateVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => Promise<boolean>;
}

export const CreateVacationModal: React.FC<CreateVacationModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for the vacation.');
      return;
    }
    setLoading(true);
    const success = await onSubmit(name.trim(), description.trim() || undefined);
    setLoading(false);
    if (success) {
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Vacation">
      <View style={styles.formContainer}>
        <TextInput
          label="Vacation Name"
          placeholder="e.g. Boracay Summer Trip 2026"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          label="Description (Optional)"
          placeholder="e.g. Beach resort, island tours & dinners"
          value={description}
          onChangeText={setDescription}
        />
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You will be the Vacation Master. A unique 6-character code will be generated to invite members.
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Create
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 2. Join Vacation Modal
// =========================================================================
export interface JoinVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<boolean>;
}

export const JoinVacationModal: React.FC<JoinVacationModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Required', 'Please enter the 6-character vacation code.');
      return;
    }
    setLoading(true);
    const success = await onSubmit(code.trim().toUpperCase());
    setLoading(false);
    if (success) {
      setCode('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Vacation">
      <View style={styles.formContainer}>
        <TextInput
          label="Vacation Code"
          placeholder="e.g. V269EC"
          autoCapitalize="characters"
          maxLength={10}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          style={styles.codeInput}
        />
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Enter the unique code shared by your Vacation Master.
        </Text>
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Join
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 3. Deposit Vacation Modal
// =========================================================================
export interface DepositVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  currency: string;
  onSubmit: (amountCentavos: number, fromAccountId: string, notes?: string) => Promise<boolean>;
}

export const DepositVacationModal: React.FC<DepositVacationModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currency,
  onSubmit
}) => {
  const { colors } = useTheme();
  const [amountStr, setAmountStr] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [isOpen, accounts, fromAccountId]);

  const selectedAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];

  const handleSubmit = async () => {
    const centavos = parseToCentavos(amountStr);
    if (centavos <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Required', 'Please select a funding account.');
      return;
    }
    if (selectedAccount.currentBalanceCentavos < centavos) {
      Alert.alert(
        'Insufficient Balance',
        `Available balance in ${selectedAccount.name} is ${formatCentavos(
          selectedAccount.currentBalanceCentavos,
          currency
        )}.`
      );
      return;
    }

    setLoading(true);
    const success = await onSubmit(centavos, selectedAccount.id, notes.trim() || undefined);
    setLoading(false);
    if (success) {
      setAmountStr('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit to Vacation Pool">
      <View style={styles.formContainer}>
        <AmountInput
          label="Deposit Amount"
          value={amountStr}
          onChangeText={setAmountStr}
        />
        <Select
          label="Funding Account"
          value={fromAccountId}
          onSelect={setFromAccountId}
          options={accounts.map((a) => ({
            label: `${a.name} (${formatCentavos(a.currentBalanceCentavos, currency)})`,
            value: a.id
          }))}
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="e.g. My initial trip contribution"
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Deposit
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 4. Create Shared Expense Modal (Master Only)
// =========================================================================
export interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacationBalanceCentavos: number;
  chipIns?: VacationChipIn[];
  currency: string;
  onSubmit: (
    title: string,
    amountCentavos: number,
    category?: string,
    notes?: string,
    deductionSource?: 'pool' | 'chip_in',
    chipInId?: string
  ) => Promise<boolean>;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  vacationBalanceCentavos,
  chipIns = [],
  currency,
  onSubmit
}) => {
  const { colors } = useTheme();
  const [deductionSource, setDeductionSource] = useState<'pool' | 'chip_in'>('pool');
  const [selectedChipInId, setSelectedChipInId] = useState('');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Accommodation');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chipIns && chipIns.length > 0 && !selectedChipInId) {
      setSelectedChipInId(chipIns[0]._id);
    }
  }, [chipIns, selectedChipInId]);

  const centavos = parseToCentavos(amountStr);
  const isChipIn = deductionSource === 'chip_in';
  const selectedChipIn = chipIns.find((c) => c._id === selectedChipInId);
  const chipInAvailableCentavos = selectedChipIn
    ? Math.max(0, selectedChipIn.totalCollectedCentavos - (selectedChipIn.totalSpentCentavos || 0))
    : 0;
  const currentAvailableBalance = isChipIn ? chipInAvailableCentavos : vacationBalanceCentavos;
  const isOverdraft = centavos > currentAvailableBalance;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an expense title.');
      return;
    }
    if (centavos <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (isChipIn && (!selectedChipInId || !selectedChipIn)) {
      Alert.alert('Required', 'Please select a valid chip-in item.');
      return;
    }
    if (isOverdraft) {
      Alert.alert(
        'Overdraft Prevented',
        isChipIn
          ? `Expense amount exceeds available balance for ${selectedChipIn?.title} (${formatCentavos(
              chipInAvailableCentavos,
              currency
            )}).`
          : `Expense amount exceeds current pool balance (${formatCentavos(
              vacationBalanceCentavos,
              currency
            )}). Please create a chip-in to pool funds first.`
      );
      return;
    }

    setLoading(true);
    const success = await onSubmit(
      title.trim(),
      centavos,
      category,
      notes.trim() || undefined,
      deductionSource,
      isChipIn ? selectedChipInId : undefined
    );
    setLoading(false);
    if (success) {
      setTitle('');
      setAmountStr('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Shared Expense">
      <View style={styles.formContainer}>
        {/* Source of Deduction Selector */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Deduction Source</Text>
        <View style={styles.sourceSelectorRow}>
          <TouchableOpacity
            onPress={() => setDeductionSource('pool')}
            style={[
              styles.sourceSelectorBtn,
              {
                borderColor: deductionSource === 'pool' ? colors.primary : colors.border,
                backgroundColor: deductionSource === 'pool' ? colors.primary + '15' : colors.card
              }
            ]}
          >
            <Text
              style={[
                styles.sourceSelectorText,
                { color: deductionSource === 'pool' ? colors.primary : colors.text }
              ]}
            >
              Main Pool
            </Text>
            <Text style={[styles.sourceSelectorSub, { color: colors.textSecondary }]}>
              {formatCentavos(vacationBalanceCentavos, currency)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDeductionSource('chip_in')}
            style={[
              styles.sourceSelectorBtn,
              {
                borderColor: deductionSource === 'chip_in' ? colors.primary : colors.border,
                backgroundColor: deductionSource === 'chip_in' ? colors.primary + '15' : colors.card
              }
            ]}
          >
            <Text
              style={[
                styles.sourceSelectorText,
                { color: deductionSource === 'chip_in' ? colors.primary : colors.text }
              ]}
            >
              Chip-in Item
            </Text>
            <Text style={[styles.sourceSelectorSub, { color: colors.textSecondary }]}>
              {chipIns && chipIns.length > 0 ? `${chipIns.length} item(s)` : 'None'}
            </Text>
          </TouchableOpacity>
        </View>

        {isChipIn && (
          chipIns.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              No chip-in items available. Create one first or deduct from Main Pool.
            </Text>
          ) : (
            <Select
              label="Select Chip-in Item"
              value={selectedChipInId}
              onSelect={setSelectedChipInId}
              options={chipIns.map((ci) => {
                const avail = Math.max(0, ci.totalCollectedCentavos - (ci.totalSpentCentavos || 0));
                return {
                  label: `${ci.title} (${formatCentavos(avail, currency)} avail)`,
                  value: ci._id
                };
              })}
            />
          )
        )}

        <View style={[styles.balanceBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.balanceBannerLabel, { color: colors.textSecondary }]}>
            {isChipIn ? 'Available Chip-in Balance:' : 'Available Main Pool Balance:'}
          </Text>
          <Text style={[styles.balanceBannerVal, { color: colors.primary }]}>
            {formatCentavos(currentAvailableBalance, currency)}
          </Text>
        </View>

        <TextInput
          label="Expense Title"
          placeholder="e.g. Resort Booking / Boat Tour"
          value={title}
          onChangeText={setTitle}
        />
        <AmountInput
          label="Expense Amount"
          value={amountStr}
          onChangeText={setAmountStr}
          error={
            isOverdraft
              ? isChipIn
                ? 'Exceeds available chip-in balance'
                : 'Exceeds available pool balance'
              : undefined
          }
        />
        <Select
          label="Category"
          value={category}
          onSelect={setCategory}
          options={[
            { label: 'Accommodation', value: 'Accommodation' },
            { label: 'Food & Dining', value: 'Food & Dining' },
            { label: 'Activities & Tours', value: 'Activities & Tours' },
            { label: 'Transportation', value: 'Transportation' },
            { label: 'Miscellaneous', value: 'Miscellaneous' }
          ]}
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="e.g. Paid in cash"
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={isOverdraft || (isChipIn && !selectedChipIn)}
            onPress={handleSubmit}
            style={styles.halfBtn}
          >
            Record
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 5. Log Personal Expense Modal (Any Member)
// =========================================================================
export interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  currency?: string;
  onSubmit: (
    title: string,
    amountCentavos: number,
    fromAccountId: string,
    category?: string,
    notes?: string
  ) => Promise<boolean>;
}

export const LogExpenseModal: React.FC<LogExpenseModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currency = 'PHP',
  onSubmit
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState('Personal Shopping');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [accounts, fromAccountId]);

  const centavos = parseToCentavos(amountStr);
  const selectedAccount = accounts.find((a) => a.id === fromAccountId);
  const isOverdraft = Boolean(selectedAccount && centavos > selectedAccount.currentBalanceCentavos);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an expense title.');
      return;
    }
    if (centavos <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Required', 'Please select an account to deduct this expense from.');
      return;
    }
    if (isOverdraft) {
      Alert.alert(
        'Insufficient Funds',
        `Amount exceeds available balance in ${selectedAccount.name} (${formatCentavos(
          selectedAccount.currentBalanceCentavos,
          currency
        )}).`
      );
      return;
    }

    setLoading(true);
    const success = await onSubmit(
      title.trim(),
      centavos,
      selectedAccount.id,
      category,
      notes.trim() || undefined
    );
    setLoading(false);
    if (success) {
      setTitle('');
      setAmountStr('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Personal Expense">
      <View style={styles.formContainer}>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Deducted from your personal account. Does not change the shared vacation pool balance.
          </Text>
        </View>
        <TextInput
          label="Item / Activity"
          placeholder="e.g. Souvenirs / Personal snack"
          value={title}
          onChangeText={setTitle}
        />
        <AmountInput
          label="Amount Spent"
          value={amountStr}
          onChangeText={setAmountStr}
          error={isOverdraft ? 'Exceeds available account balance' : undefined}
        />
        <Select
          label="Deduct From Account"
          value={fromAccountId}
          onSelect={setFromAccountId}
          options={accounts.map((a) => ({
            label: `${a.name} (${formatCentavos(a.currentBalanceCentavos, currency)})`,
            value: a.id
          }))}
        />
        <Select
          label="Category"
          value={category}
          onSelect={setCategory}
          options={[
            { label: 'Personal Shopping', value: 'Personal Shopping' },
            { label: 'Snacks & Drinks', value: 'Snacks & Drinks' },
            { label: 'Transportation', value: 'Transportation' },
            { label: 'Miscellaneous', value: 'Miscellaneous' }
          ]}
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="e.g. Bought at souvenir shop"
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" label="Cancel" onPress={onClose} style={styles.halfBtn} />
          <Button
            variant="primary"
            label="Deduct & Save"
            loading={loading}
            onPress={handleSubmit}
            style={styles.halfBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 6. Create Chip-in Modal (Master Only)
// =========================================================================
export interface CreateChipInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, targetAmountCentavos?: number, description?: string) => Promise<boolean>;
}

export const CreateChipInModal: React.FC<CreateChipInModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for the chip-in.');
      return;
    }
    const targetCentavos = parseToCentavos(targetStr);
    setLoading(true);
    const success = await onSubmit(
      title.trim(),
      targetCentavos > 0 ? targetCentavos : undefined,
      description.trim() || undefined
    );
    setLoading(false);
    if (success) {
      setTitle('');
      setTargetStr('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Chip-in">
      <View style={styles.formContainer}>
        <TextInput
          label="Chip-in Title"
          placeholder="e.g. Group Dinner / Boat Rental"
          value={title}
          onChangeText={setTitle}
        />
        <AmountInput
          label="Target Amount (Optional)"
          placeholder="Leave empty for open-ended"
          value={targetStr}
          onChangeText={setTargetStr}
        />
        <TextInput
          label="Description (Optional)"
          placeholder="e.g. Pitching in for tonight's buffet"
          value={description}
          onChangeText={setDescription}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Create
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 7. Contribute to Chip-in Modal (Any Member)
// =========================================================================
export interface ContributeChipInModalProps {
  isOpen: boolean;
  onClose: () => void;
  chipIn: VacationChipIn | null;
  accounts: Account[];
  currency: string;
  onSubmit: (chipInId: string, amountCentavos: number, fromAccountId: string, notes?: string) => Promise<boolean>;
}

export const ContributeChipInModal: React.FC<ContributeChipInModalProps> = ({
  isOpen,
  onClose,
  chipIn,
  accounts,
  currency,
  onSubmit
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [isOpen, accounts, fromAccountId]);

  if (!chipIn) return null;

  const selectedAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];

  const handleSubmit = async () => {
    const centavos = parseToCentavos(amountStr);
    if (centavos <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Required', 'Please select a funding account.');
      return;
    }
    if (selectedAccount.currentBalanceCentavos < centavos) {
      Alert.alert(
        'Insufficient Balance',
        `Available balance in ${selectedAccount.name} is ${formatCentavos(
          selectedAccount.currentBalanceCentavos,
          currency
        )}.`
      );
      return;
    }

    setLoading(true);
    const success = await onSubmit(chipIn._id, centavos, selectedAccount.id, notes.trim() || undefined);
    setLoading(false);
    if (success) {
      setAmountStr('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chip in: ${chipIn.title}`}>
      <View style={styles.formContainer}>
        <AmountInput
          label="Contribution Amount"
          value={amountStr}
          onChangeText={setAmountStr}
        />
        <Select
          label="Fund From Account"
          value={fromAccountId}
          onSelect={setFromAccountId}
          options={accounts.map((a) => ({
            label: `${a.name} (${formatCentavos(a.currentBalanceCentavos, currency)})`,
            value: a.id
          }))}
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="e.g. My contribution"
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Chip In
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 8. Refund Modal (Master Only)
// =========================================================================
export interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacation: Vacation;
  chipIns?: VacationChipIn[];
  currency: string;
  onSubmit: (
    memberUserId: string,
    amountCentavos: number,
    notes?: string,
    refundSource?: 'pool' | 'chip_in',
    chipInId?: string | null
  ) => Promise<boolean>;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  vacation,
  chipIns = [],
  currency,
  onSubmit
}) => {
  const { colors } = useTheme();
  const [memberUserId, setMemberUserId] = useState(vacation.members[0]?.userId || '');
  const [refundSource, setRefundSource] = useState<'pool' | 'chip_in'>('pool');
  const [selectedChipInId, setSelectedChipInId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const getChipInAvailable = (c: VacationChipIn) =>
    c.totalCollectedCentavos - (c.totalSpentCentavos || 0) - (c.totalRefundedCentavos || 0);

  const availableChipIns = chipIns.filter((c) => getChipInAvailable(c) > 0);

  useEffect(() => {
    if (refundSource === 'chip_in' && !selectedChipInId && availableChipIns.length > 0) {
      setSelectedChipInId(availableChipIns[0]._id);
    }
  }, [refundSource, selectedChipInId, availableChipIns]);

  const selectedChipIn = chipIns.find((c) => c._id === selectedChipInId);
  const maxRefund =
    refundSource === 'chip_in'
      ? selectedChipIn
        ? getChipInAvailable(selectedChipIn)
        : 0
      : vacation.balanceCentavos;

  const centavos = parseToCentavos(amountStr);
  const isOverRemaining = centavos > maxRefund;

  const handleSubmit = async () => {
    if (!memberUserId) {
      Alert.alert('Required', 'Please select a member to refund.');
      return;
    }
    if (refundSource === 'chip_in' && !selectedChipIn) {
      Alert.alert('Required', 'Please select a chip-in item with remaining funds.');
      return;
    }
    if (centavos <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (isOverRemaining) {
      Alert.alert(
        'Overdraft Prevented',
        `Refund cannot exceed remaining ${refundSource === 'chip_in' ? 'chip-in' : 'pool'} balance (${formatCentavos(
          maxRefund,
          currency
        )}).`
      );
      return;
    }

    setLoading(true);
    const success = await onSubmit(
      memberUserId,
      centavos,
      notes.trim() || undefined,
      refundSource,
      refundSource === 'chip_in' ? selectedChipInId : null
    );
    setLoading(false);
    if (success) {
      setAmountStr('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Leftover Refund">
      <View style={styles.formContainer}>
        {/* Source Selector */}
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Source of Refund</Text>
        <View style={styles.sourceSelectorRow}>
          <TouchableOpacity
            style={[
              styles.sourceOptionBtn,
              {
                backgroundColor: refundSource === 'pool' ? colors.primary + '20' : colors.card,
                borderColor: refundSource === 'pool' ? colors.primary : colors.border
              }
            ]}
            onPress={() => setRefundSource('pool')}
          >
            <Text style={[styles.sourceOptionTitle, { color: refundSource === 'pool' ? colors.primary : colors.text }]}>
              Main Pool
            </Text>
            <Text style={[styles.sourceOptionSub, { color: colors.textMuted }]}>
              {formatCentavos(vacation.balanceCentavos, currency)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sourceOptionBtn,
              {
                backgroundColor: refundSource === 'chip_in' ? colors.primary + '20' : colors.card,
                borderColor: refundSource === 'chip_in' ? colors.primary : colors.border
              }
            ]}
            onPress={() => setRefundSource('chip_in')}
          >
            <Text style={[styles.sourceOptionTitle, { color: refundSource === 'chip_in' ? colors.primary : colors.text }]}>
              Chip-in Item
            </Text>
            <Text style={[styles.sourceOptionSub, { color: colors.textMuted }]}>
              {availableChipIns.length} available
            </Text>
          </TouchableOpacity>
        </View>

        {refundSource === 'chip_in' && (
          availableChipIns.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              No chip-in items currently have leftover remaining funds.
            </Text>
          ) : (
            <Select
              label="Select Chip-in Item"
              value={selectedChipInId}
              onSelect={setSelectedChipInId}
              options={availableChipIns.map((c) => ({
                label: `${c.title} (${formatCentavos(getChipInAvailable(c), currency)})`,
                value: c._id
              }))}
            />
          )
        )}

        <View style={[styles.balanceBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.balanceBannerLabel, { color: colors.textSecondary }]}>
            {refundSource === 'chip_in' ? 'Available Chip-in Remaining:' : 'Remaining Pool Balance:'}
          </Text>
          <Text style={[styles.balanceBannerVal, { color: colors.primary }]}>
            {formatCentavos(maxRefund, currency)}
          </Text>
        </View>

        <Select
          label="Select Member"
          value={memberUserId}
          onSelect={setMemberUserId}
          options={vacation.members.map((m) => ({
            label: `${m.name} (${m.role})`,
            value: m.userId
          }))}
        />
        <AmountInput
          label="Refund Amount"
          value={amountStr}
          onChangeText={setAmountStr}
          error={isOverRemaining ? `Exceeds remaining ${refundSource === 'chip_in' ? 'chip-in' : 'pool'} balance` : undefined}
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="e.g. End of trip return"
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={isOverRemaining || (refundSource === 'chip_in' && !selectedChipIn)}
            onPress={handleSubmit}
            style={styles.halfBtn}
          >
            Transfer
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 9. Reverse Log Modal (Master Only)
// =========================================================================
export interface ReverseLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: VacationTransactionLog | null;
  currency: string;
  onSubmit: (logId: string, reason: string) => Promise<boolean>;
}

export const ReverseLogModal: React.FC<ReverseLogModalProps> = ({
  isOpen,
  onClose,
  log,
  currency,
  onSubmit
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!log) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a reason for reversing this entry.');
      return;
    }
    setLoading(true);
    const success = await onSubmit(log._id, reason.trim());
    setLoading(false);
    if (success) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Append Reversing Entry">
      <View style={styles.formContainer}>
        <Text style={styles.logSummary}>
          Reversing: {log.description} ({formatCentavos(log.amountCentavos, currency)})
        </Text>
        <TextInput
          label="Reason for Reversal"
          placeholder="e.g. Entered incorrect amount by mistake"
          value={reason}
          onChangeText={setReason}
        />
        <View style={styles.buttonRow}>
          <Button variant="outline" onPress={onClose} style={styles.halfBtn}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onPress={handleSubmit} style={styles.halfBtn}>
            Reverse Entry
          </Button>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// 10. Past Vacation Summary Modal (Viewing Member Privacy Isolation)
// =========================================================================
export interface PastVacationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PastVacationSummary | null;
  currency: string;
}

export const PastVacationSummaryModal: React.FC<PastVacationSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  currency
}) => {
  const { colors } = useTheme();

  if (!summary) return null;

  const { vacation, sharedExpenses = [], myLoggedExpenses, myChipIns, summary: stats } = summary;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={vacation.name}>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Privacy Isolation Alert */}
          <View style={[styles.privacyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Transparent Shared Records: Group shared expenses are visible to all members. Other members' personal logged expenses and chip-ins remain strictly private.
            </Text>
          </View>

          {/* Metric Highlights */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Your Net Total</Text>
              <Text style={[styles.metricVal, { color: colors.primary }]}>
                {formatCentavos(stats.myTotalSpentCentavos, currency)}
              </Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shared Total</Text>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {formatCentavos(stats.totalSharedExpensesCentavos, currency)}
              </Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pool Deposits</Text>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {formatCentavos(stats.myDepositsCentavos, currency)}
              </Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Chip-ins</Text>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {formatCentavos(stats.myChipInContributionsCentavos, currency)}
              </Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Refunds</Text>
              <Text style={[styles.metricVal, { color: colors.income }]}>
                {formatCentavos(stats.myRefundsCentavos, currency)}
              </Text>
            </View>
          </View>

          {/* Section: Everyone's Shared Expenses */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Shared Expenses of Everyone ({sharedExpenses.length})
          </Text>
          {sharedExpenses.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              No group shared expenses recorded.
            </Text>
          ) : (
            sharedExpenses.map((se) => (
              <View
                key={se._id}
                style={[styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordTitle, { color: colors.text }]}>{se.title}</Text>
                  <Text style={[styles.recordSub, { color: colors.textMuted }]}>
                    {se.category || 'Shared'} • by {se.createdByName} • {se.deductionSource === 'chip_in' ? 'Chip-in' : 'Main Pool'}
                  </Text>
                </View>
                <Text style={[styles.recordAmt, { color: colors.text }]}>
                  {formatCentavos(se.amountCentavos, currency)}
                </Text>
              </View>
            ))
          )}

          {/* Section: Your Logged Expenses */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.md }]}>
            Your Logged Expenses ({myLoggedExpenses.length})
          </Text>
          {myLoggedExpenses.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              No personal expenses recorded.
            </Text>
          ) : (
            myLoggedExpenses.map((e) => (
              <View
                key={e._id}
                style={[styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordTitle, { color: colors.text }]}>{e.title}</Text>
                  <Text style={[styles.recordSub, { color: colors.textMuted }]}>
                    {e.category || 'General'}
                  </Text>
                </View>
                <Text style={[styles.recordAmt, { color: colors.text }]}>
                  {formatCentavos(e.amountCentavos, currency)}
                </Text>
              </View>
            ))
          )}

          {/* Section: Your Chip-in Contributions */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.md }]}>
            Your Chip-ins ({myChipIns.length})
          </Text>
          {myChipIns.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              No chip-in contributions found.
            </Text>
          ) : (
            myChipIns.map((ci) => (
              <View
                key={ci._id}
                style={[styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordTitle, { color: colors.text }]}>{ci.title}</Text>
                  <Text style={[styles.recordSub, { color: colors.textMuted }]}>
                    {ci.contributions.length} contribution(s)
                  </Text>
                </View>
                <Text style={[styles.recordAmt, { color: colors.primary }]}>
                  {formatCentavos(
                    ci.contributions.reduce((s, c) => s + c.amountCentavos, 0),
                    currency
                  )}
                </Text>
              </View>
            ))
          )}

          <Button variant="outline" onPress={onClose} style={{ marginTop: spacing.md }}>
            Close
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    gap: spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  helperText: {
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSizes.xs,
    flex: 1,
  },
  balanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  balanceBannerLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  balanceBannerVal: {
    fontSize: typography.fontSizes.sm,
    fontWeight: 'bold',
  },
  logSummary: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: typography.fontSizes.xs,
    flex: 1,
    fontWeight: typography.fontWeights.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeights.semibold,
  },
  metricVal: {
    fontSize: typography.fontSizes.sm,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  recordTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  recordSub: {
    fontSize: 10,
  },
  recordAmt: {
    fontSize: typography.fontSizes.xs,
    fontWeight: 'bold',
  },
  sourceSelectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sourceSelectorBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceSelectorText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  sourceSelectorSub: {
    fontSize: 10,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 4,
  },
  sourceOptionBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceOptionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  sourceOptionSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
