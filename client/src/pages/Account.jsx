import { useState } from 'react';
import { Camera, Check, LockKeyhole } from 'lucide-react';
import { api } from '../lib/api';
import { initials, imageUrl, passwordValid } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Field, FormError, PageHeading } from '../components/UI';
export default function Account() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState({});
  async function profile(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    if (!body.get('avatar')?.size) body.delete('avatar');
    const file = body.get('avatar');
    if (file && file.size > 5 * 1024 * 1024) {
      setError({ profile: 'Choose an image smaller than 5 MB.' });
      return;
    }
    setBusy('profile');
    setError({});
    try {
      const response = await api('/user/profile', { method: 'PATCH', body });
      setUser(response.data);
      toast('Your profile has been updated');
    } catch (error) {
      setError({ profile: error });
    } finally {
      setBusy('');
    }
  }
  async function password(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!passwordValid(data.newPassword)) {
      setError({
        password:
          'Use at least 8 characters with uppercase, lowercase, a number, and a special character (!@#$%^&*).',
      });
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      setError({ password: 'Your new passwords do not match.' });
      return;
    }
    delete data.confirmPassword;
    setBusy('password');
    setError({});
    try {
      const result = await api('/user/change-password', { method: 'PATCH', body: data });
      setUser(result.user);
      form.reset();
      toast('Password updated. Your other sessions have been signed out.');
    } catch (error) {
      setError({ password: error });
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="page account-page">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A little about you."
        description="Manage your profile and keep your account secure."
      />
      <div className="settings-grid">
        <section className="settings-intro">
          <span className="large-avatar">
            {imageUrl(user.avatar) ? (
              <img src={user.avatar} alt="Your avatar" />
            ) : (
              initials(user.name)
            )}
          </span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="pill-outline capitalize">{user.role}</span>
          <p className="settings-note">
            Your curiosity makes this place.
            <br />
            Thanks for being part of Forma.
          </p>
        </section>
        <div className="settings-panels">
          <section className="panel">
            <div className="panel-heading">
              <h2>Your profile</h2>
              <span className="subtle">The essentials</span>
            </div>
            <form key={user._id} onSubmit={profile}>
              <FormError error={error.profile} />
              <div className="form-columns">
                <Field label="Full name" id="profile-name">
                  <input
                    id="profile-name"
                    name="name"
                    defaultValue={user.name}
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email address" id="profile-email">
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                    autoComplete="email"
                  />
                </Field>
              </div>
              <Field label="A little about you" id="bio">
                <textarea
                  id="bio"
                  name="bio"
                  defaultValue={user.bio || ''}
                  maxLength={200}
                  rows={3}
                  placeholder="What are you curious about?"
                />
              </Field>
              <Field label="Profile photo" id="avatar" hint="JPG, PNG or WebP. Up to 5 MB.">
                <div className="file-input-wrap">
                  <Camera size={20} />
                  <input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </div>
              </Field>
              <Button type="submit" busy={busy === 'profile'} disabled={Boolean(busy)}>
                <Check size={17} />
                Save changes
              </Button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Password & security</h2>
              <LockKeyhole size={19} />
            </div>
            <form onSubmit={password}>
              <FormError error={error.password} />
              <Field label="Current password" id="current-password">
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={72}
                />
              </Field>
              <div className="form-columns">
                <Field label="New password" id="new-password">
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </Field>
                <Field label="Confirm new password" id="confirm-password">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </Field>
              </div>
              <p className="form-hint">
                Use 8+ characters, uppercase, lowercase, a number and a special character
                (!@#$%^&*).
              </p>
              <Button
                type="submit"
                busy={busy === 'password'}
                disabled={Boolean(busy)}
                className="secondary"
              >
                Update password
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
