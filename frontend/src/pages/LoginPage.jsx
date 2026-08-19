import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import CoffeeLogo from "../components/CoffeeLogo";
import {
  clearAuthData,
  getAuthToken,
  getAuthUserName,
  saveAuthData,
} from "../utils/authStorage";
import { loginUser } from "../services/api/authApi";
import { getErrorMessage } from "../utils/errorMessage";

function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const token = getAuthToken();
  const userName = getAuthUserName();

  const handleLogout = () => {
    clearAuthData();
    window.location.reload();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setErrorMessage("");
      const data = await loginUser({ email, password });
      saveAuthData(data);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(error.message ? getErrorMessage(error, t) : t("auth.login.fallbackError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (token) {
    return (
      <div className="home-page px-6 py-16">
        <div className="home-empty-state">
          <span className="empty-state-icon"><CheckCircle size={36} strokeWidth={1.5} /></span>
          <p className="empty-state-title">
            {t("auth.alreadyLoggedInAs", { name: userName || "user" })}
          </p>
          <div className="home-actions">
            <Link className="home-link" to="/">{t("auth.goToHome")}</Link>
            <button className="home-link danger" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <CoffeeLogo size={32} />
        </div>
        <p className="auth-card-kicker">Welcome Back</p>
        <h1>Login</h1>
        <p className="auth-card-desc">
          {t("auth.login.desc")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ margin: 0 }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ margin: 0 }}
            />
          </label>

          {errorMessage && <p className="error-message" style={{ margin: 0 }}>{errorMessage}</p>}

          <button className="home-link" type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Register →</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
