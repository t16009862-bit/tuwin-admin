import { NavLink, Outlet } from 'react-router-dom';
import { clearAdminAccessKey } from '../api/client';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Admin Panel</div>
        <nav className="sidebar-nav">
          <NavLink to="/articles" className={({ isActive }) => (isActive ? 'active' : '')}>
            Articles
          </NavLink>
          <NavLink to="/gallery" className={({ isActive }) => (isActive ? 'active' : '')}>
            Gallery
          </NavLink>
          <NavLink to="/bio" className={({ isActive }) => (isActive ? 'active' : '')}>
            Bio
          </NavLink>
          <NavLink to="/sponsors" className={({ isActive }) => (isActive ? 'active' : '')}>
            Sponsors
          </NavLink>
          <NavLink to="/packages" className={({ isActive }) => (isActive ? 'active' : '')}>
            Packages
          </NavLink>
          <NavLink to="/rankings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Rankings
          </NavLink>
          <NavLink to="/ranking-records" className={({ isActive }) => (isActive ? 'active' : '')}>
            PSA Records
          </NavLink>
          <NavLink to="/site-music" className={({ isActive }) => (isActive ? 'active' : '')}>
            Site Music
          </NavLink>
          <NavLink to="/upcoming" className={({ isActive }) => (isActive ? 'active' : '')}>
            Upcoming
          </NavLink>
          <NavLink to="/coach-club" className={({ isActive }) => (isActive ? 'active' : '')}>
            Coach &amp; Club
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : '')}>
            Contact
          </NavLink>
          <NavLink to="/career-achievements" className={({ isActive }) => (isActive ? 'active' : '')}>
            Career Achievements
          </NavLink>
          <NavLink to="/career-highlights" className={({ isActive }) => (isActive ? 'active' : '')}>
            Career Highlights
          </NavLink>
          <NavLink to="/competency-blueprint" className={({ isActive }) => (isActive ? 'active' : '')}>
            Competency Blueprint
          </NavLink>
          <NavLink to="/training-history" className={({ isActive }) => (isActive ? 'active' : '')}>
            Training History
          </NavLink>
          <NavLink to="/biography" className={({ isActive }) => (isActive ? 'active' : '')}>
            Biography
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <a
            href="https://docs.google.com/spreadsheets/d/1sY7_eNfVYkKDoS3SXm1ft2luVwKsN59orsIjehfV9Xs/edit"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Google Sheet ↗
          </a>
          <button
            type="button"
            className="sidebar-signout"
            onClick={() => {
              clearAdminAccessKey();
              window.location.reload();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
