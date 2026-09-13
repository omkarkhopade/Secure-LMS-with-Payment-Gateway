import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Compass,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSaved } from '../contexts/SavedContext';
import { useToast } from '../contexts/ToastContext';
import { initials, imageUrl } from '../lib/format';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Forma home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        forma<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export default function Layout() {
  const { user, logout } = useAuth();
  const { items } = useSaved();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const toggleRef = useRef();
  useEffect(() => {
    setOpen(false);
    const target = document.querySelector('#main-content');
    target?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  async function signOut() {
    try {
      await logout();
      navigate('/');
      toast('You have been signed out');
    } catch (error) {
      toast(error.message);
    }
  }
  const links = [
    { to: '/', icon: Compass, label: 'Discover', end: true },
    { to: '/courses', icon: BookOpen, label: 'All courses' },
    { to: '/learning', icon: GraduationCap, label: 'My learning' },
    { to: '/saved', icon: Bookmark, label: 'Saved courses', count: items.length },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? 'is-open' : ''}`}
        id="main-navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={21} />
          </button>
        </div>
        <p className="sidebar-caption">YOUR SPACE TO GROW</p>
        <nav className="primary-nav">
          {links.map(({ to, icon: Icon, label, end, count }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={20} strokeWidth={1.65} />
              <span>{label}</span>
              {count > 0 && <span className="nav-count">{count}</span>}
            </NavLink>
          ))}
        </nav>
        {user?.role === 'instructor' && (
          <>
            <p className="nav-label">TEACHING</p>
            <nav className="primary-nav">
              <NavLink to="/studio">
                <LayoutDashboard size={20} strokeWidth={1.65} />
                Instructor studio
              </NavLink>
            </nav>
          </>
        )}
        <div className="sidebar-note">
          <span className="tiny-spark" aria-hidden="true">
            &#10035;
          </span>
          <p>
            Good things take
            <br />
            <em>a little learning.</em>
          </p>
          <Link to="/courses">
            Find your next course
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <nav className="primary-nav">
            <NavLink to="/help">
              <HelpCircle size={19} />
              Learning guide
            </NavLink>
            <NavLink to="/account">
              <Settings size={19} />
              Account settings
            </NavLink>
          </nav>
          {user ? (
            <div className="sidebar-user">
              <span className="avatar">
                {imageUrl(user.avatar) ? (
                  <img
                    src={user.avatar}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  initials(user.name)
                )}
              </span>
              <Link to="/account">
                <strong>{user.name}</strong>
                <small>
                  {user.role === 'instructor' ? 'Instructor account' : 'Your learning journey'}
                </small>
              </Link>
              <button className="icon-button" aria-label="Sign out" onClick={signOut}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link className="sidebar-signin" to="/signin">
              <span className="avatar">
                <GraduationCap size={21} />
              </span>
              <span>
                <strong>Make yourself at home</strong>
                <small>Sign in to start learning</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={toggleRef}
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={23} />
            </button>
            <span className="topbar-title">Learning, with intention.</span>
          </div>
          <form
            className="header-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/courses?query=${encodeURIComponent(search.trim())}`);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search courses"
              placeholder="What do you want to learn?"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="search-submit" aria-label="Submit search">
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="header-actions">
            {user ? (
              <Link className="avatar header-avatar" to="/account" aria-label="Your account">
                {initials(user.name)}
              </Link>
            ) : (
              <Link className="button compact" to="/signup">
                Get started
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="footer">
          <span>&copy; {new Date().getFullYear()} Forma. A space to grow.</span>
          <Link to="/help">
            A little help along the way
            <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
