import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, Eye, ImagePlus, Plus, Upload, Video } from 'lucide-react';
import { api } from '../lib/api';
import { duration } from '../lib/format';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Loading,
  PageHeading,
} from '../components/UI';
export default function CourseEditor() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState({});
  const resource = useResource(
    (signal) =>
      courseId
        ? api(`/course/c/${courseId}`, { signal }).then((r) => r.data)
        : Promise.resolve(null),
    courseId || 'new',
  );
  if (resource.loading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (resource.error)
    return (
      <div className="page">
        <ErrorState error={resource.error} retry={resource.reload} />
      </div>
    );
  const course = resource.data;
  if (course && (course.instructor?._id || course.instructor) !== user._id)
    return (
      <div className="page">
        <EmptyState
          title="This is another instructor’s course."
          description="Open your studio to manage your own courses."
          to="/studio"
          action="Back to your studio"
        />
      </div>
    );
  async function save(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    const file = body.get('thumbnail');
    if (file?.size > 5 * 1024 * 1024) {
      setError({ details: 'Choose a thumbnail smaller than 5 MB.' });
      return;
    }
    if (!file?.size) body.delete('thumbnail');
    setBusy('details');
    setError({});
    try {
      const result = await api(courseId ? `/course/c/${courseId}` : '/course', {
        method: courseId ? 'PATCH' : 'POST',
        body,
      });
      toast(courseId ? 'Course details saved' : 'Your draft is ready. Add your first lesson.');
      if (!courseId) navigate(`/studio/${result.data._id}`, { replace: true });
      else resource.reload();
    } catch (error) {
      setError({ details: error });
    } finally {
      setBusy('');
    }
  }
  async function addLesson(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    if (body.get('video')?.size > 50 * 1024 * 1024) {
      setError({ lesson: 'Choose a video smaller than 50 MB.' });
      return;
    }
    body.set('isPreview', body.has('isPreview') ? 'true' : 'false');
    setBusy('lesson');
    setError({});
    try {
      await api(`/course/c/${courseId}/lectures`, { method: 'POST', body });
      form.reset();
      resource.reload();
      toast('Lesson uploaded and added to your course');
    } catch (error) {
      setError({ lesson: error });
    } finally {
      setBusy('');
    }
  }
  async function publish() {
    setBusy('publish');
    setError({});
    try {
      await api(`/course/c/${courseId}`, {
        method: 'PATCH',
        body: { isPublished: !course.isPublished },
      });
      resource.reload();
      toast(course.isPublished ? 'Course returned to draft' : 'Your course is published');
    } catch (error) {
      setError({ publish: error });
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="page editor-page">
      <Link className="back-link" to="/studio">
        <ArrowLeft size={16} />
        Instructor studio
      </Link>
      <PageHeading
        eyebrow={course ? 'SHAPE YOUR COURSE' : 'START SOMETHING GOOD'}
        title={course ? 'A course worth sharing.' : 'From knowledge to possibility.'}
        description={
          course
            ? course.title
            : 'Start with the essentials. Your course is saved as a draft until you publish it.'
        }
      >
        {course && (
          <span className={`status-label ${course.isPublished ? 'published' : ''}`}>
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
        )}
      </PageHeading>
      <div className="editor-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <h2>01. The essentials</h2>
              <span className="subtle">Course details</span>
            </div>
            <form key={course?._id || 'new'} onSubmit={save}>
              <FormError error={error.details} />
              <Field id="course-title" label="Course title">
                <input
                  id="course-title"
                  name="title"
                  defaultValue={course?.title || ''}
                  required
                  maxLength={100}
                  placeholder="Give your course a clear, memorable name"
                />
              </Field>
              <Field id="course-subtitle" label="Short introduction">
                <input
                  id="course-subtitle"
                  name="subtitle"
                  defaultValue={course?.subtitle || ''}
                  maxLength={200}
                  placeholder="What will your students learn?"
                />
              </Field>
              <div className="form-columns">
                <Field id="category" label="Category">
                  <input
                    id="category"
                    name="category"
                    list="course-categories"
                    defaultValue={course?.category || ''}
                    required
                    maxLength={100}
                    placeholder="Choose or enter a category"
                  />
                  <datalist id="course-categories">
                    <option value="Development" />
                    <option value="Design" />
                    <option value="Business" />
                  </datalist>
                </Field>
                <Field id="level" label="Experience level">
                  <select id="level" name="level" defaultValue={course?.level || 'beginner'}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </Field>
              </div>
              <Field
                id="description"
                label="About the course"
                hint="Plain text. Explain what students will learn, who it’s for, and anything they need before starting."
              >
                <textarea
                  id="description"
                  name="description"
                  defaultValue={course?.description || ''}
                  rows={6}
                  maxLength={10000}
                />
              </Field>
              <Field id="price" label="Course price (INR)">
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="1"
                  max="10000000"
                  step="0.01"
                  defaultValue={course?.price || ''}
                  required
                  placeholder="e.g. 1499"
                />
              </Field>
              <Field
                id="thumbnail"
                label={course ? 'Replace course thumbnail (optional)' : 'Course thumbnail'}
                hint="JPG, PNG or WebP, up to 5 MB. A landscape image works best."
              >
                <div className="file-input-wrap">
                  <ImagePlus size={22} />
                  <input
                    id="thumbnail"
                    name="thumbnail"
                    type="file"
                    required={!courseId}
                    accept="image/jpeg,image/png,image/webp"
                  />
                </div>
              </Field>
              <Button type="submit" busy={busy === 'details'} disabled={Boolean(busy)}>
                <Check size={17} />
                {courseId ? 'Save course details' : 'Create draft course'}
              </Button>
            </form>
          </section>
          {course && (
            <section className="panel">
              <div className="panel-heading">
                <h2>02. Bring it to life</h2>
                <span className="subtle">{course.lectures.length} lessons</span>
              </div>
              {course.lectures.length > 0 && (
                <ol className="editor-lessons">
                  {course.lectures.map((lecture, i) => (
                    <li key={lecture._id}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <Video size={18} />
                      <strong>{lecture.title}</strong>
                      <small>
                        {lecture.isPreview ? 'Free preview · ' : ''}
                        {duration(lecture.duration)}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
              <form onSubmit={addLesson}>
                <h3>Add a lesson</h3>
                <FormError error={error.lesson} />
                <Field id="lesson-title" label="Lesson title">
                  <input
                    id="lesson-title"
                    name="title"
                    required
                    maxLength={100}
                    placeholder="What’s this lesson about?"
                  />
                </Field>
                <Field id="lesson-description" label="Lesson notes">
                  <textarea id="lesson-description" name="description" rows={3} maxLength={500} />
                </Field>
                <Field
                  id="video"
                  label="Lesson video"
                  hint="MP4, WebM or MOV, up to 50 MB. Keep this page open while the video uploads."
                >
                  <div className="file-input-wrap">
                    <Upload size={22} />
                    <input
                      id="video"
                      name="video"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      required
                    />
                  </div>
                </Field>
                <label className="checkbox-label">
                  <input name="isPreview" type="checkbox" />
                  Make this lesson a free preview
                </label>
                <Button type="submit" busy={busy === 'lesson'} disabled={Boolean(busy)}>
                  <Plus size={17} />
                  {busy === 'lesson' ? 'Uploading lesson…' : 'Add lesson'}
                </Button>
              </form>
            </section>
          )}
        </div>
        <aside className="editor-guide">
          <p className="eyebrow">A THOUGHTFUL FIRST STEP</p>
          <h2>
            Teach the way
            <br />
            <em>you’d like to learn.</em>
          </h2>
          <p>Start with a clear outcome. Give each lesson one purpose. Leave room for practice.</p>
          <div className="editor-checklist">
            <span>
              <Check size={16} />A title that tells the story
            </span>
            <span>
              <Check size={16} />A clear course introduction
            </span>
            <span>
              <Check size={16} />
              Short, focused video lessons
            </span>
          </div>
          {course && (
            <>
              <hr />
              <h3>Ready for your students?</h3>
              <p>
                {course.isPublished
                  ? 'Your course is visible in the library. Returning it to draft hides it from new students; existing learners keep access.'
                  : 'Add at least one lesson before publishing your course to the library.'}
              </p>
              <FormError error={error.publish} />
              <Button
                className="full"
                busy={busy === 'publish'}
                disabled={Boolean(busy) || (!course.isPublished && !course.lectures.length)}
                onClick={publish}
              >
                <Eye size={17} />
                {course.isPublished ? 'Return to draft' : 'Publish course'}
              </Button>
              <Link className="text-link" to={`/course-detail/${courseId}`}>
                View course page
                <ArrowLeft size={15} className="rotate-arrow" />
              </Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
