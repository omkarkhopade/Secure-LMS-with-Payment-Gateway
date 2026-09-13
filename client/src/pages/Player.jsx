import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Play, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { duration } from '../lib/format';
import { useResource } from '../hooks/useResource';
import { useToast } from '../contexts/ToastContext';
import { Button, EmptyState, ErrorState, FormError, Loading } from '../components/UI';
export default function Player() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const resource = useResource(
    (signal) => api(`/progress/${courseId}`, { signal }).then((r) => r.data),
    courseId,
  );
  // Signed media URLs are short-lived. Fetch a fresh one when changing lessons.
  const requested = params.get('lecture');
  useEffect(() => {
    setVideoError(false);
  }, [requested, resource.data]);
  const { error: resourceError, reload } = resource;
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    if (resourceError?.status !== 403 || waiting >= 5) return;
    const timer = setTimeout(() => {
      setWaiting((n) => n + 1);
      reload();
    }, 3000);
    return () => clearTimeout(timer);
  }, [resourceError, reload, waiting]);
  if (resource.loading && !resource.data)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (resource.error)
    return (
      <div className="page">
        <Link className="back-link" to={`/course-detail/${courseId}`}>
          <ArrowLeft size={16} />
          Course details
        </Link>
        {resource.error.status === 403 ? (
          <EmptyState
            title="Your course is almost ready."
            description="If you’ve just paid, confirmation can take a moment. Please refresh to check your access. If you haven’t enrolled yet, return to the course details."
          />
        ) : (
          <ErrorState error={resource.error} />
        )}
        <Button className="secondary centered" onClick={resource.reload}>
          <RefreshCw size={16} />
          Check course access
        </Button>
      </div>
    );
  const data = resource.data;
  const course = data.courseDetails;
  const lectures = course.lectures || [];
  const selected = lectures.find((l) => l._id === requested) || lectures[0];
  const index = lectures.indexOf(selected);
  const completed = new Set(data.progress.filter((p) => p.isCompleted).map((p) => p.lecture));
  async function markComplete() {
    setBusy(true);
    setError(null);
    try {
      await api(`/progress/${courseId}/lectures/${selected._id}`, { method: 'PATCH' });
      resource.reload();
      toast('Lesson complete. One more step forward.');
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  function changeLesson(lecture) {
    setParams({ lecture: lecture._id });
    resource.reload();
  }
  return (
    <div className="page player-page">
      <Link className="back-link" to="/learning">
        <ArrowLeft size={16} />
        My learning
      </Link>
      <div className="player-heading">
        <div>
          <p className="eyebrow">YOUR NEXT SMALL STEP</p>
          <h1>{course.title}</h1>
        </div>
        <span className="completion-badge">
          <CheckCircle2 size={17} />
          {data.completionPercentage}% complete
        </span>
      </div>
      {!selected ? (
        <EmptyState
          title="Lessons are on their way."
          description="Your instructor is preparing this course. Check back soon."
        />
      ) : (
        <div className="player-grid">
          <div>
            <div className="video-stage">
              {selected.videoUrl && !videoError ? (
                <video
                  key={`${selected._id}:${selected.videoUrl}`}
                  src={selected.videoUrl}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  onError={() => setVideoError(true)}
                  aria-label={selected.title}
                />
              ) : (
                <div className="video-unavailable">
                  <Play size={38} strokeWidth={1.2} />
                  <h2>
                    {videoError ? 'Let’s refresh your lesson.' : 'This video isn’t available yet.'}
                  </h2>
                  <p>
                    {videoError
                      ? 'The video link may have expired, or playback could not start.'
                      : 'Try refreshing, or return to this lesson later.'}
                  </p>
                  <Button className="lime" onClick={resource.reload}>
                    <RefreshCw size={16} />
                    Refresh video
                  </Button>
                </div>
              )}
            </div>
            <div className="lesson-detail">
              <div>
                <p className="eyebrow">
                  LESSON {index + 1} OF {lectures.length}
                </p>
                <h2>{selected.title}</h2>
                <p className="preserve-lines subtle">
                  {selected.description ||
                    'Take your time, take notes, and mark this lesson complete when you’re ready.'}
                </p>
              </div>
              <FormError error={error} />
              <div className="lesson-actions">
                <Button busy={busy} disabled={completed.has(selected._id)} onClick={markComplete}>
                  <Check size={17} />
                  {completed.has(selected._id) ? 'Lesson completed' : 'Mark as complete'}
                </Button>
                {index < lectures.length - 1 && (
                  <Button className="secondary" onClick={() => changeLesson(lectures[index + 1])}>
                    Next lesson
                    <ArrowRight size={17} />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <aside className="lesson-sidebar">
            <div className="lesson-sidebar-heading">
              <h2>Course content</h2>
              <span>{lectures.length} lessons</span>
              <progress
                value={data.completionPercentage}
                max="100"
                aria-label="Course completion"
              />
            </div>
            <ol>
              {lectures.map((lecture, i) => (
                <li key={lecture._id}>
                  <button
                    className={selected._id === lecture._id ? 'selected' : ''}
                    aria-current={selected._id === lecture._id ? 'step' : undefined}
                    onClick={() => changeLesson(lecture)}
                  >
                    {completed.has(lecture._id) ? (
                      <CheckCircle2 size={18} className="completed-icon" />
                    ) : (
                      <Circle size={18} />
                    )}
                    <span>
                      <strong>
                        {String(i + 1).padStart(2, '0')} &nbsp;{lecture.title}
                      </strong>
                      <small>{duration(lecture.duration)}</small>
                    </span>
                    {selected._id === lecture._id && <Play size={13} />}
                  </button>
                </li>
              ))}
            </ol>
            <p className="sidebar-encouragement">
              Progress is a practice.
              <br />
              <em>Keep showing up for yourself.</em>
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
