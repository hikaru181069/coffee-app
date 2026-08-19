import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import CoffeeLogo from "../components/CoffeeLogo";
import FormField from "../features/coffee-records/components/FormField";
import { controlClass, primaryButtonClass } from "../features/coffee-records/components/formStyles";
import { validateLoginForm, hasErrors } from "../utils/authFormValidation";
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
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const token = getAuthToken();
  const userName = getAuthUserName();

  const handleLogout = () => {
    clearAuthData();
    window.location.reload();
  };

  const setValue = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateLoginForm(values, t);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      setSubmitError("");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      setErrors({});
      const data = await loginUser(values);
      saveAuthData(data);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setSubmitError(error.message ? getErrorMessage(error, t) : t("auth.login.fallbackError"));
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
              {t("nav.logout")}
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
        <p className="auth-card-kicker">{t("auth.welcomeBack")}</p>
        <h1>{t("auth.loginHeading")}</h1>
        <p className="auth-card-desc">
          {t("auth.login.desc")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField id="email" label={t("profile.email")} required error={errors.email}>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(event) => setValue("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={controlClass(Boolean(errors.email))}
            />
          </FormField>

          <FormField id="password" label={t("auth.password")} required error={errors.password}>
            <input
              id="password"
              type="password"
              name="password"
              value={values.password}
              onChange={(event) => setValue("password", event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={controlClass(Boolean(errors.password))}
            />
          </FormField>

          {submitError && <p className="error-message" style={{ margin: 0 }}>{submitError}</p>}

          <button className={primaryButtonClass} type="submit" disabled={submitting}>
            {submitting ? t("auth.loginCtaPending") : t("auth.loginCta")}
          </button>
        </form>

        <p className="auth-switch">
          {t("auth.noAccount")}{" "}
          <Link to="/register">{t("nav.register")} →</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
