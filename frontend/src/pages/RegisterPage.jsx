import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import CoffeeLogo from "../components/CoffeeLogo";
import FormField from "../features/coffee-records/components/FormField";
import { controlClass, primaryButtonClass } from "../features/coffee-records/components/formStyles";
import { validateRegisterForm, hasErrors } from "../utils/authFormValidation";
import { registerUser } from "../services/api/authApi";
import { saveAuthData } from "../utils/authStorage";
import { getErrorMessage } from "../utils/errorMessage";

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    const validationErrors = validateRegisterForm(values, t);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      setSubmitError("");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      setErrors({});
      const data = await registerUser(values);
      saveAuthData(data);
      navigate("/");
    } catch (error) {
      console.error("Register error:", error);
      setSubmitError(error.message ? getErrorMessage(error, t) : t("auth.register.fallbackError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <CoffeeLogo size={32} />
        </div>
        <p className="auth-card-kicker">{t("auth.getStarted")}</p>
        <h1>{t("auth.registerHeading")}</h1>
        <p className="auth-card-desc">
          {t("auth.register.desc")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField id="name" label={t("profile.name")} required error={errors.name}>
            <input
              id="name"
              type="text"
              name="name"
              value={values.name}
              onChange={(event) => setValue("name", event.target.value)}
              placeholder={t("auth.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={controlClass(Boolean(errors.name))}
            />
          </FormField>

          <FormField id="email" label={t("profile.email")} required error={errors.email}>
            <input
              id="email"
              type="email"
              name="email"
              value={values.email}
              onChange={(event) => setValue("email", event.target.value)}
              placeholder="you@example.com"
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
            {submitting ? t("auth.registerCtaPending") : t("auth.registerCta")}
          </button>
        </form>

        <p className="auth-switch">
          {t("auth.hasAccount")}{" "}
          <Link to="/login">{t("nav.login")} →</Link>
        </p>
      </section>
    </div>
  );
}

export default RegisterPage;
