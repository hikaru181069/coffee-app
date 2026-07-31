import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../services/api/authApi";
import { saveAuthData } from "../utils/authStorage";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setErrorMessage("");
      const data = await registerUser(formData);
      saveAuthData(data);
      navigate("/onboarding/favorites");
    } catch (error) {
      console.error("Register error:", error);
      setErrorMessage(error.message || "Failed to register. Please check your input.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="auth-card-kicker">Get Started</p>
        <h1>Register</h1>
        <p className="auth-card-desc">
          Create an account to save players and get personalized recommendations.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              style={{ margin: 0 }}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={{ margin: 0 }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="password"
              style={{ margin: 0 }}
            />
          </label>

          {errorMessage && <p className="error-message" style={{ margin: 0 }}>{errorMessage}</p>}

          <button className="home-link" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Login →</Link>
        </p>
      </section>
    </div>
  );
}

export default RegisterPage;
