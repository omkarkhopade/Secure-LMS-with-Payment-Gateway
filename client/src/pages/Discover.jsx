import { Link } from 'react-router';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Layers3,
  MoveUpRight,
  PenTool,
  Play,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useResource } from '../hooks/useResource';
import { api } from '../lib/api';
import CourseCard from '../components/CourseCard';
import { EmptyState, ErrorState, Loading } from '../components/UI';
export default function Discover() {
  const { user } = useAuth();
  const courses = useResource((signal) => api('/course/published?limit=3', { signal }), 'discover');
  return (
    <div className="page discover-page">
      <div className="welcome-line">
        <span>
          <span className="status-dot" />
          {user ? `WELCOME BACK, ${user.name.split(' ')[0].toUpperCase()}` : 'FOR THE EVER-CURIOUS'}
        </span>
        <span>
          A fresh perspective starts here
          <MoveUpRight size={14} />
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="pill-outline">THE NEXT CHAPTER</span>
            <span>Yours to write.</span>
          </div>
          <h1>
            A little curiosity.
            <br />A whole new
            <br />
            <em>chapter.</em>
            <span className="headline-star" aria-hidden="true">
              &#10035;
            </span>
          </h1>
          <p>
            Make space for what moves you. Discover practical courses and build skills that stay
            with you.
          </p>
          <Link className="button lime" to="/courses">
            Find your next course
            <ArrowUpRight size={19} />
          </Link>
          <a href="#new-courses" className="hero-scroll">
            <span>
              <ArrowDown size={15} />
            </span>
            Take a look around
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <div className="art-label">
            ALWAYS A WORK
            <br />
            IN PROGRESS.
          </div>
          <div className="book book-back">
            <span>01 — STAY CURIOUS</span>
          </div>
          <div className="book book-main">
            <div className="book-top">
              <span>THE ART OF</span>
              <span>f.</span>
            </div>
            <p>
              Getting
              <br />
              <em>somewhere.</em>
            </p>
            <div className="book-stair">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="book-bottom">
              ONE GOOD LESSON AT A TIME.
              <ArrowUpRight size={26} />
            </div>
          </div>
          <div className="art-note">
            <span className="note-icon">
              <Play fill="currentColor" size={14} />
            </span>
            <div>
              Small steps.
              <br />
              <strong>Lasting skills.</strong>
            </div>
            <span className="note-line" />
          </div>
          <div className="art-footer">
            <span>YOUR PACE. YOUR POSSIBILITIES.</span>
            <span>&#8599;</span>
          </div>
        </div>
      </section>
      <div className="value-strip">
        <span>
          <span>01</span>Follow your curiosity
        </span>
        <span>
          <span>02</span>Learn at your own pace
        </span>
        <span>
          <span>03</span>Put your skills to work
        </span>
      </div>
      <section className="topics-section" aria-labelledby="topics-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CHOOSE A DIRECTION</p>
            <h2 id="topics-title">Where will curiosity take you?</h2>
          </div>
          <Link className="text-link" to="/courses">
            Explore everything
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="topic-grid">
          {[
            {
              label: 'Development',
              description: 'Build something that works.',
              icon: Braces,
              theme: 'sage',
            },
            {
              label: 'Design',
              description: 'Make your ideas take shape.',
              icon: PenTool,
              theme: 'peach',
            },
            {
              label: 'Business',
              description: 'Turn ambition into action.',
              icon: TrendingUp,
              theme: 'lavender',
            },
          ].map(({ label, description, icon: Icon, theme }) => (
            <Link key={label} className={`topic-card ${theme}`} to={`/courses?categories=${label}`}>
              <span className="topic-icon">
                <Icon size={24} strokeWidth={1.5} />
              </span>
              <div>
                <h3>{label}</h3>
                <p>{description}</p>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section id="new-courses" aria-labelledby="new-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KEEP YOUR MIND OPEN</p>
            <h2 id="new-title">Your next good discovery.</h2>
          </div>
          <Link to="/courses" className="text-link">
            View all courses
            <ArrowRight size={17} />
          </Link>
        </div>
        {courses.loading ? (
          <Loading cards />
        ) : courses.error ? (
          <ErrorState error={courses.error} retry={courses.reload} />
        ) : courses.data?.data.length ? (
          <div className="course-grid">
            {courses.data.data.map((course) => (
              <CourseCard course={course} key={course._id} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Something good is on the way."
            description="Our course library is taking shape. Check back soon for your next discovery."
            icon={Layers3}
          />
        )}
      </section>
      <section className="bottom-note">
        <span className="note-number">A NOTE TO THE LEARNER</span>
        <p>
          You don’t have to know it all.
          <br />
          <em>Just be open to what’s next.</em>
        </p>
        <Link
          to={user ? '/learning' : '/signup'}
          className="round-link"
          aria-label={user ? 'Open my learning' : 'Create an account'}
        >
          <ArrowUpRight size={27} />
        </Link>
      </section>
    </div>
  );
}
