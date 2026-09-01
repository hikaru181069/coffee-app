/**
 * updateProfile / changePassword の入力を検証する。
 *
 * authValidator.js と同じ「DB/Expressに依存しない純粋関数、
 * {valid, details}を返す」パターンに揃える。以前はuserController.js内に
 * インラインで書かれており、他のvalidatorsと形が異なっていた。
 */

const MIN_PASSWORD_LENGTH = 6;

export const validateUpdateProfile = (body = {}) => {
  const details = [];

  if (typeof body.name !== "string" || !body.name.trim()) {
    details.push({ field: "name", message: "Name is required" });
  }

  return { valid: details.length === 0, details };
};

export const validateChangePassword = (body = {}) => {
  const details = [];

  if (typeof body.currentPassword !== "string" || !body.currentPassword) {
    details.push({ field: "currentPassword", message: "Current password is required" });
  }

  if (typeof body.newPassword !== "string" || !body.newPassword) {
    details.push({ field: "newPassword", message: "New password is required" });
  } else if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: "newPassword",
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  return { valid: details.length === 0, details };
};
