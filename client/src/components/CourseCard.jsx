import { Link } from 'react-router';
import { ArrowUpRight, Bookmark, Clock3, Layers3 } from 'lucide-react';
import { useSaved } from '../contexts/SavedContext';
import { duration, imageUrl, initials, money } from '../lib/format';
export function CourseCover({ course, className = '' }) {
  const theme = (course.category || '').toLowerCase().includes('design')
    ? 'design'
    : (course.category || '').toLowerCase().includes('business')
      ? 'business'
      : 'development';
  return (
    <div className={`course-cover ${theme} ${className}`}>
      <div className="cover-fallback" aria-hidden="true">
        <span className="cover-orbit" />
        <span className="cover-object" />
        <span className="cover-caption">{course.category || 'A new perspective'}</span>
        <span className="cover-corner">f.</span>
      </div>
      {imageUrl(course.thumbnail) && (
        <img
          src={course.thumbnail}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
export default function CourseCard({ course, enrolled = false }) {
  const { toggle, isSaved } = useSaved();
  const saved = isSaved(course._id);
  const to = enrolled ? `/course-progress/${course._id}` : `/course-detail/${course._id}`;
  return (
    <article className="course-card">
      <div className="card-image-wrap">
        <Link to={to} tabIndex={-1} aria-hidden="true">
          <CourseCover course={course} />
        </Link>
        {course.level && <span className="level-tag">{course.level}</span>}
        <button
          className={`save-button ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? 'Unsave' : 'Save'} ${course.title}`}
          aria-pressed={saved}
          onClick={() => toggle(course)}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <p className="course-category">{course.category || 'Course'}</p>
        <h3>
          <Link to={to}>
            {course.title}
            <ArrowUpRight size={18} />
          </Link>
        </h3>
        <div className="teacher-line">
          <span className="mini-avatar">{initials(course.instructor?.name)}</span>
          <span>{course.instructor?.name || 'Forma instructor'}</span>
        </div>
        <div className="card-meta">
          <span>
            <Layers3 size={14} />
            {course.totalLectures || course.lectures?.length || 0} lessons
          </span>
          <span>
            <Clock3 size={14} />
            {duration(course.totalDuration)}
          </span>
        </div>
        <div className="card-bottom">
          <span>{enrolled ? 'In your library' : money(course.price)}</span>
          <Link to={to}>
            {enrolled ? 'Continue learning' : 'View course'}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
