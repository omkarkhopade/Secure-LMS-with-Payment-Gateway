import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Layers3,
  LockKeyhole,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { checkout, paymentProviders } from '../lib/checkout';
import { duration, initials, money } from '../lib/format';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../contexts/AuthContext';
import { useSaved } from '../contexts/SavedContext';
import { CourseCover } from '../components/CourseCard';
import { Button, ErrorState, FormError, Loading } from '../components/UI';
export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { toggle, isSaved } = useSaved();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(paymentProviders[0] || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const result = useResource(
    async (signal) => {
      if (user)
        return (await api(`/purchase/course/${courseId}/detail-with-status`, { signal })).data;
      return { course: (await api(`/course/c/${courseId}`, { signal })).data, isPurchased: false };
    },
    `${courseId}:${user?._id || ''}`,
  );
  useEffect(() => {
    setPreview(null);
    setError(null);
  }, [courseId]);
  if (result.loading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (result.error)
    return (
      <div className="page">
        <Link className="back-link" to="/courses">
          <ArrowLeft size={16} />
          Back to courses
        </Link>
        <ErrorState error={result.error} retry={result.reload} />
      </div>
    );
  const { course, isPurchased } = result.data;
  const owner = (course.instructor?._id || course.instructor) === user?._id;
  const access = isPurchased || owner;
  async function enroll() {
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(`/course-detail/${courseId}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await checkout(provider, course, user);
      if (provider === 'razorpay') navigate(`/course-progress/${courseId}`);
    } catch (error) {
      setError(
        error.status === 503
          ? 'This payment option is temporarily unavailable. Please choose another option or try again later.'
          : error,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page detail-page">
      <Link to="/courses" className="back-link">
        <ArrowLeft size={16} />
        Back to the library
      </Link>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-tags">
            <span className="pill-outline">{course.category}</span>
            <span className="subtle capitalize">{course.level}</span>
          </div>
          <h1>{course.title}</h1>
          <p className="detail-subtitle">
            {course.subtitle || 'A new perspective, one lesson at a time.'}
          </p>
          <div className="detail-teacher">
            <span className="avatar">{initials(course.instructor?.name)}</span>
            <div>
              <small>A COURSE BY</small>
              <strong>{course.instructor?.name || 'Forma instructor'}</strong>
            </div>
            <span className="detail-separator" />
            <span>
              <Layers3 size={16} />
              {course.lectures?.length || 0} lessons
            </span>
            <span>
              <Clock3 size={16} />
              {duration(course.totalDuration)}
            </span>
          </div>
          <div className="detail-cover">
            {preview ? (
              <video
                key={preview._id}
                controls
                autoPlay
                controlsList="nodownload"
                src={preview.videoUrl}
                onError={() =>
                  setError('This preview link may have expired. Refresh the course and try again.')
                }
              />
            ) : (
              <CourseCover course={course} />
            )}
            <span className="cover-footnote">A LITTLE LEARNING GOES A LONG WAY.</span>
          </div>
          <section className="detail-section">
            <p className="eyebrow">A NEW PERSPECTIVE</p>
            <h2>About this course</h2>
            <p className="preserve-lines">
              {course.description || 'Explore the lessons below to see what this course covers.'}
            </p>
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h2>Your path through the course</h2>
              <span className="subtle">{course.lectures?.length || 0} lessons</span>
            </div>
            <div className="curriculum">
              {course.lectures?.length ? (
                course.lectures.map((lecture, index) => (
                  <div key={lecture._id} className="curriculum-row">
                    <span className="lesson-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{lecture.title}</strong>
                      <small>{duration(lecture.duration)}</small>
                    </div>
                    {lecture.videoUrl ? (
                      <button
                        className="text-link"
                        onClick={() => {
                          if (access)
                            navigate(`/course-progress/${courseId}?lecture=${lecture._id}`);
                          else {
                            setPreview(lecture);
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }
                        }}
                      >
                        <Play size={15} />
                        {access ? 'Watch' : 'Preview'}
                      </button>
                    ) : (
                      <LockKeyhole size={16} className="muted" aria-label="Enrollment required" />
                    )}
                  </div>
                ))
              ) : (
                <p className="subtle">The instructor is preparing lessons for this course.</p>
              )}
            </div>
          </section>
          {course.instructor?.bio && (
            <section className="detail-section">
              <h2>Meet your instructor</h2>
              <p className="preserve-lines">{course.instructor.bio}</p>
            </section>
          )}
        </div>
        <aside className="enrollment-card">
          <p className="eyebrow">INVEST IN YOUR NEXT CHAPTER</p>
          <div className="detail-price">{access ? 'You’re in.' : money(course.price)}</div>
          <p className="subtle">
            {access
              ? 'This course is ready in your library.'
              : 'One course. A new set of possibilities.'}
          </p>
          <ul className="course-benefits">
            <li>
              <Check size={16} />
              Learn at your own pace
            </li>
            <li>
              <Check size={16} />
              Keep track of your progress
            </li>
            <li>
              <Check size={16} />
              Revisit lessons as you grow
            </li>
          </ul>
          <FormError error={error} />
          {access ? (
            <Link className="button full" to={`/course-progress/${courseId}`}>
              Continue learning
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              {user && paymentProviders.length > 1 && (
                <fieldset className="payment-options">
                  <legend>Choose a payment option</legend>
                  {paymentProviders.map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={provider === value}
                        onChange={() => setProvider(value)}
                      />
                      <span>{value === 'razorpay' ? 'Razorpay' : 'Stripe'}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <Button
                className="full"
                busy={busy}
                disabled={
                  course.price <= 0 || !course.lectures?.length || (Boolean(user) && !provider)
                }
                onClick={enroll}
              >
                {user ? 'Enroll in this course' : 'Sign in to enroll'}
                <ArrowRight size={18} />
              </Button>
              {course.price <= 0 && (
                <small className="subtle">Enrollment for this course is not available yet.</small>
              )}
              {!course.lectures?.length && (
                <small className="subtle">Enrollment opens when the lessons are ready.</small>
              )}
            </>
          )}
          <button
            className="button secondary full"
            aria-pressed={isSaved(courseId)}
            onClick={() => toggle(course)}
          >
            <Bookmark size={17} />
            {isSaved(courseId) ? 'Saved to your collection' : 'Save for later'}
          </button>
          <p className="secure-note">
            <ShieldCheck size={15} />
            Secure checkout. Your details stay private.
          </p>
        </aside>
      </div>
    </div>
  );
}
