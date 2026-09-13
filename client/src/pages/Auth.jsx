import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { passwordValid, safeNext } from '../lib/format';
import { Button, Field, FormError } from '../components/UI';
export default function Auth({ mode = 'signin' }) {
  const signup = mode === 'signup';
  const { user, authenticate } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (user) return <Navigate to={next} replace />;
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setError(null);
    if (signup && !passwordValid(data.password)) {
      setError(
        'Use 8 or more characters, with uppercase, lowercase, a number, and a special character (!@#$%^&*). Maximum 72 bytes.',
      );
      return;
    }
    setBusy(true);
    try {
      await authenticate(mode, data);
      toast(
        signup
          ? 'Welcome to Forma. Your next chapter starts here.'
          : 'Welcome back. Make yourself at home.',
      );
      navigate(next, { replace: true });
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page auth-page">
      <section className="auth-story">
        <p className="eyebrow">A SPACE TO BECOME</p>
        <h1>
          Every good story
          <br />
          starts with
          <br />
          <em>curiosity.</em>
        </h1>
        <div className="auth-art" aria-hidden="true">
          <div className="auth-circle" />
          <div className="auth-arch" />
          <span>
            KEEP
            <br />
            GROWING.
          </span>
          <ArrowUpRight size={54} strokeWidth={1} />
        </div>
        <p>
          New perspectives. Practical skills.
          <br />A little more possibility, every day.
        </p>
      </section>
      <section className="auth-form-wrap">
        <span className="auth-step">
          {signup ? 'YOUR NEXT CHAPTER STARTS HERE' : 'A FAMILIAR PLACE. A FRESH START.'}
        </span>
        <h2>{signup ? 'Room for one more.' : 'Good to see you again.'}</h2>
        <p className="subtle">
          {signup
            ? 'Create your account and follow your curiosity.'
            : 'Sign in to pick up your learning journey.'}
        </p>
        <form onSubmit={submit}>
          <FormError error={error} />
          {signup && (
            <Field label="Full name" id="name">
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={50}
                placeholder="Your full name"
              />
            </Field>
          )}
          <Field label="Email address" id="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </Field>
          <Field
            label="Password"
            id="password"
            hint={
              signup
                ? '8+ characters, uppercase, lowercase, a number and a special character (!@#$%^&*).'
                : undefined
            }
          >
            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={signup ? 8 : undefined}
                maxLength={72}
                autoComplete={signup ? 'new-password' : 'current-password'}
                placeholder={signup ? 'Create a strong password' : 'Enter your password'}
                aria-describedby={signup ? 'password-hint' : undefined}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <Button type="submit" busy={busy} className="full">
            {signup ? 'Create your account' : 'Sign in'}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="auth-switch">
          {signup ? 'Already part of Forma?' : 'New around here?'}{' '}
          <Link to={`/${signup ? 'signin' : 'signup'}?next=${encodeURIComponent(next)}`}>
            {signup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <div className="auth-footnote">
          {signup ? (
            'Your progress, purchases, and learning—all in one place.'
          ) : (
            <>
              Need help getting back in? <Link to="/help">Read the learning guide</Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
