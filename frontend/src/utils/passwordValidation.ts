export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasMaxLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  score: number;
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const hasMinLength = password.length >= 8;
  const hasMaxLength = password.length <= 64;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;

  const isValid = hasMinLength && hasMaxLength && hasUpper && hasLower && hasDigit && hasSpecial;

  return {
    isValid,
    hasMinLength,
    hasMaxLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial,
    score,
  };
};

export const PASSWORD_REQUIREMENTS_SUMMARY =
  'Must be 8-64 characters and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.';