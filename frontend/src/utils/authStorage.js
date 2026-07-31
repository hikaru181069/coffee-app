export const saveAuthData = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("userName", data.name);
  localStorage.setItem("userEmail", data.email);
};

export const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const getAuthUserName = () => {
  return localStorage.getItem("userName");
};

export const saveAuthUserName = (name) => {
  localStorage.setItem("userName", name);
};

export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
};
