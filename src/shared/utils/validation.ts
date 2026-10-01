export const validateRequired = (
  value: string | undefined | null,
  fieldName: string
): string | null => {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePositiveAmount = (
  centavos: number,
  fieldName: string = 'Amount'
): string | null => {
  if (!centavos || centavos <= 0) {
    return `${fieldName} must be greater than zero`;
  }
  return null;
};
