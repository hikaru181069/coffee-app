import { Link } from "react-router-dom";

function AppNav() {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <Link to="/">Home</Link>
      <Link to="/search">Search</Link>
      <Link to="/favorites">Favorites</Link>
      <Link to="/login">Login</Link>
      <Link to="/register">Register</Link>
    </nav>
  );
}

export default AppNav;
