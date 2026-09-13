import { Link } from 'react-router';
import { ArrowUpRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { allPages } from '../lib/api';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../contexts/AuthContext';
import CourseCard from '../components/CourseCard';
import { EmptyState, ErrorState, Loading, PageHeading } from '../components/UI';
export default function Learning() {
  const { user } = useAuth();
  const result = useResource((signal) => allPages('/purchase', signal), user._id);
  return (
    <div className="page">
      <PageHeading
        eyebrow="ONE LESSON AT A TIME"
        title={`Keep going, ${user.name.split(' ')[0]}.`}
        description="Pick up where you left off. Your next small step is right here."
      >
        <Link className="button secondary" to="/courses">
          Discover more
          <ArrowUpRight size={17} />
        </Link>
      </PageHeading>
      <div className="learning-banner">
        <div className="learning-banner-icon">
          <BookOpen size={30} strokeWidth={1.4} />
        </div>
        <div>
          <h2>Your learning, at your pace.</h2>
          <p>Every lesson is a step forward. There’s no finish line for curiosity.</p>
        </div>
        <CheckCircle2 size={31} strokeWidth={1} />
      </div>
      <div className="section-heading">
        <h2>Your course library</h2>
        {result.data && (
          <span className="subtle">
            {result.data.length} {result.data.length === 1 ? 'course' : 'courses'}
          </span>
        )}
      </div>
      {result.loading ? (
        <Loading cards />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : result.data?.length ? (
        <div className="course-grid">
          {result.data.map((course) => (
            <CourseCard key={course._id} course={course} enrolled />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your first chapter is waiting."
          description="Once you enroll in a course, you’ll find it here—ready when you are."
          to="/courses"
        />
      )}
    </div>
  );
}
