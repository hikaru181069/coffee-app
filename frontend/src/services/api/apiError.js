export const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const isUnauthorizedError = (error) => {
  return error?.status === 401;
};
