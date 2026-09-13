import { ArrowRight, BookOpen, RefreshCw, AlertCircle, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router';
export function Button({ busy, disabled, children, className = '', type = 'button', ...props }) {
  return (
    <button
      className={`button ${className}`}
      type={type}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <LoaderCircle className="spin" size={17} />}
      {children}
    </button>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="subtle">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title = 'A fresh page, full of possibility.',
  description,
  to,
  action,
  icon: Icon = BookOpen,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {to && (
        <Link className="button" to={to}>
          {action || 'Explore courses'}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={26} />
      <h2>We couldn’t load this just yet.</h2>
      <p>{error?.message || 'Please try again in a moment.'}</p>
      {retry && (
        <Button className="secondary" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </Button>
      )}
    </div>
  );
}
export function Loading({ cards = false }) {
  return cards ? (
    <div className="course-grid" aria-label="Loading courses" role="status">
      {[1, 2, 3].map((i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-image shimmer" />
          <div className="skeleton-line shimmer" />
          <div className="skeleton-line short shimmer" />
        </div>
      ))}
    </div>
  ) : (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>Getting things ready…</span>
    </div>
  );
}
export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
export function FormError({ error }) {
  return error ? (
    <div className="form-error" role="alert">
      <AlertCircle size={17} />
      <span>
        {error.message || error}
        {error.errors?.length > 0 && (
          <ul>
            {error.errors.map((e, i) => (
              <li key={i}>
                {e.field}: {e.message}
              </li>
            ))}
          </ul>
        )}
      </span>
    </div>
  ) : null;
}
export function Pagination({ page, more, onChange }) {
  return (
    <nav className="pagination" aria-label="Course pages">
      <Button className="secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span>Page {page}</span>
      <Button className="secondary" disabled={!more} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
