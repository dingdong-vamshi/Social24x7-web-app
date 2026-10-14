export const passwordRequirements = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'A special character', test: (value: string) => /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(value) },
] as const
export function validNewPassword(value: string) {
  return value.length <= 128 && passwordRequirements.every(requirement => requirement.test(value))
}
export const passwordPolicyMessage = 'Use 8–128 characters with uppercase and lowercase letters, a number and a special character.'
