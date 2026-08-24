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

/**
 * トークンが失効・無効化された（APIが401を返した）ときに呼ぶ。
 * 認証情報を消し、ログイン画面へ強制的に戻す。
 *
 * React Routerのnavigateではなくwindow.location.hrefによるフルリロード
 * にしているのは、Navbar.jsxの明示的なログアウトと同じ方式に揃えるため
 * （SPAの状態をすべてリセットしたい。トークンだけ消して画面はそのまま、
 * という中途半端な状態を避ける）。
 */
export const handleUnauthorized = () => {
  clearAuthData();
  window.location.href = "/login";
};
