import { Link } from 'react-router';
import { ArrowUpRight, BookOpen, Eye, Plus, Users } from 'lucide-react';
import { allPages } from '../lib/api';
import { money } from '../lib/format';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../contexts/AuthContext';
import { CourseCover } from '../components/CourseCard';
import { EmptyState, ErrorState, Loading, PageHeading } from '../components/UI';
export default function Studio() {
  const { user } = useAuth();
  const resource = useResource((signal) => allPages('/course', signal), user._id);
  const courses = resource.data || [];
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE INSTRUCTOR STUDIO"
        title="Share what you know."
        description="Thoughtful lessons begin here. Shape a course, add your videos, and make it yours."
      >
        <Link to="/studio/new" className="button">
          <Plus size={18} />
          Create a course
        </Link>
      </PageHeading>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <div className="studio-stats">
            {[
              { label: 'Your courses', value: courses.length, icon: BookOpen },
              {
                label: 'Published courses',
                value: courses.filter((c) => c.isPublished).length,
                icon: Eye,
              },
              {
                label: 'Course enrollments',
                value: courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0),
                icon: Users,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div className="stat-card" key={label}>
                <Icon size={21} strokeWidth={1.5} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>Your courses</h2>
            <span className="subtle">From first draft to fresh perspective</span>
          </div>
          {courses.length ? (
            <div className="studio-list">
              {courses.map((course) => (
                <article className="studio-course" key={course._id}>
                  <CourseCover course={course} />
                  <div className="studio-course-info">
                    <span className={`status-label ${course.isPublished ? 'published' : ''}`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <h3>
                      <Link to={`/studio/${course._id}`}>{course.title}</Link>
                    </h3>
                    <p>
                      {course.category} · {course.totalLectures || 0} lessons ·{' '}
                      {money(course.price)}
                    </p>
                  </div>
                  <Link to={`/studio/${course._id}`} className="button secondary">
                    Edit course
                    <ArrowUpRight size={17} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your knowledge deserves a place."
              description="Create your first course and turn what you know into someone else’s next step."
              to="/studio/new"
              action="Create your first course"
            />
          )}
        </>
      )}
    </div>
  );
}
