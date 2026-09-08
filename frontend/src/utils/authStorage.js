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
 * 認証情報を消し、ログイン画面へ強制的に戻す。
 *
 * React Routerのnavigateではなくwindow.location.hrefによるフルリロードに
 * しているのは、SPAの状態をすべてリセットしたいため（トークンだけ消して
 * 画面はそのまま、という中途半端な状態を避ける）。Navbar.jsxの明示的な
 * ログアウトボタン・LoginPage.jsxのログイン済み状態からのログアウト・
 * 下記handleUnauthorized（401時の自動ログアウト）の3箇所が同じ処理を
 * 個別に持っていたため、ここへ共通化した。
 */
export const logout = () => {
  clearAuthData();
  window.location.href = "/login";
};

/** トークンが失効・無効化された（APIが401を返した）ときに呼ぶ */
export const handleUnauthorized = () => {
  logout();
};
