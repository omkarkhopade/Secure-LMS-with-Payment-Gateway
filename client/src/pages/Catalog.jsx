import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';
import { useResource } from '../hooks/useResource';
import CourseCard from '../components/CourseCard';
import { EmptyState, ErrorState, Loading, PageHeading, Pagination } from '../components/UI';
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = params.get('query') || '';
  const category = params.get('categories') || '';
  const requestParams = new URLSearchParams({
    query,
    categories: category,
    sortBy: params.get('sortBy') || 'newest',
    page: String(page),
    limit: '9',
  });
  if (params.get('level')) requestParams.set('level', params.get('level'));
  const key = requestParams.toString();
  const result = useResource((signal) => api(`/course/search?${key}`, { signal }), key);
  const update = (field, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(field, value) : next.delete(field);
    if (field !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE COURSE LIBRARY"
        title="A world of possibility."
        description="Find the right course for where you are—and where you want to go."
      />
      <form
        className="catalog-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update('query', new FormData(e.currentTarget).get('query').trim());
        }}
      >
        <Search size={20} />
        <input
          key={query}
          name="query"
          defaultValue={query}
          placeholder="Search for a skill, a topic, a new direction…"
          aria-label="Search the course library"
          maxLength={100}
        />
        <button className="button" type="submit">
          Find a course
        </button>
      </form>
      <div className="catalog-toolbar">
        <div className="category-tabs" aria-label="Course categories">
          {['', 'Development', 'Design', 'Business'].map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              aria-pressed={category === item}
              onClick={() => update('categories', item)}
            >
              {item || 'All courses'}
            </button>
          ))}
          {category && !['Development', 'Design', 'Business'].includes(category) && (
            <button className="active" onClick={() => update('categories', '')}>
              {category}
              <X size={14} />
            </button>
          )}
        </div>
        <div className="filter-controls">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Course level"
            value={params.get('level') || ''}
            onChange={(e) => update('level', e.target.value)}
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            aria-label="Sort courses"
            value={params.get('sortBy') || 'newest'}
            onChange={(e) => update('sortBy', e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>
      {query && (
        <div className="search-summary">
          Results for “{query}”
          <button className="text-link" onClick={() => update('query', '')}>
            Clear search
            <X size={14} />
          </button>
        </div>
      )}
      {result.loading ? (
        <Loading cards />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : result.data?.data.length ? (
        <>
          <div className="course-grid">
            {result.data.data.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
          <Pagination
            page={page}
            more={result.data.data.length === 9}
            onChange={(value) => update('page', String(value))}
          />
        </>
      ) : (
        <>
          <EmptyState
            title="A different direction, perhaps?"
            description="We couldn’t find courses matching these filters. Try another topic or explore the full library."
          />
          <button className="button secondary centered" onClick={() => setParams({})}>
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}
