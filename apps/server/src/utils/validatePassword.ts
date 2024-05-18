export default function validatePassword(password: string) {
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  // Check for at least one digit
  if (!/\d/.test(password)) {
    return "Password must contain at least one digit.";
  }

  // Check for at least one symbol
  if (!/[!@#$%^&*()?]/.test(password)) {
    return "Password must contain at least one symbol.";
  }

  // Check minimum length of 8 characters
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  // Password is valid
  return null;
}
