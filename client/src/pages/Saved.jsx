import { Bookmark } from 'lucide-react';
import { useSaved } from '../contexts/SavedContext';
import CourseCard from '../components/CourseCard';
import { EmptyState, PageHeading } from '../components/UI';
export default function Saved() {
  const { items } = useSaved();
  return (
    <div className="page">
      <PageHeading
        eyebrow="GOOD THINGS, FOR LATER"
        title="Your curiosity collection."
        description="A place for courses that caught your eye. Saved on this browser for whenever you’re ready."
      />
      {items.length ? (
        <div className="course-grid">
          {items.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Keep a little inspiration here."
          description="Tap the bookmark on any course to save it for later. Your next chapter can wait until you’re ready."
          to="/courses"
        />
      )}
    </div>
  );
}
