import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import Layout from './components/Layout';
import { EmptyState, Loading } from './components/UI';
import { useAuth } from './contexts/AuthContext';
const Discover = lazy(() => import('./pages/Discover'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Saved = lazy(() => import('./pages/Saved'));
const Learning = lazy(() => import('./pages/Learning'));
const Auth = lazy(() => import('./pages/Auth'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Player = lazy(() => import('./pages/Player'));
const Account = lazy(() => import('./pages/Account'));
const Studio = lazy(() => import('./pages/Studio'));
const CourseEditor = lazy(() => import('./pages/CourseEditor'));
const Help = lazy(() => import('./pages/Help'));
function Protected({ instructor = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (instructor && user.role !== 'instructor')
    return (
      <div className="page">
        <EmptyState
          title="A space for instructors."
          description="Instructor access is approved by the platform operator. In the meantime, there’s plenty to discover."
          to="/courses"
        />
      </div>
    );
  return <Outlet />;
}
function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'A space to grow',
      '/courses': 'Course library',
      '/learning': 'My learning',
      '/saved': 'Saved courses',
      '/account': 'Your account',
      '/studio': 'Instructor studio',
      '/signin': 'Welcome back',
      '/signup': 'Create your account',
      '/help': 'Learning guide',
    };
    document.title = `${titles[pathname] || (pathname.includes('course-progress') ? 'Your classroom' : pathname.includes('studio') ? 'Course editor' : 'Your next chapter')} — Forma`;
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <>
      <RouteTitle />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Discover />} />
            <Route path="courses" element={<Catalog />} />
            <Route path="saved" element={<Saved />} />
            <Route path="signin" element={<Auth key="signin" />} />
            <Route path="signup" element={<Auth key="signup" mode="signup" />} />
            <Route path="help" element={<Help />} />
            <Route path="course-detail/:courseId" element={<CourseDetail />} />
            <Route element={<Protected />}>
              <Route path="learning" element={<Learning />} />
              <Route path="course-progress/:courseId" element={<Player />} />
              <Route path="account" element={<Account />} />
            </Route>
            <Route element={<Protected instructor />}>
              <Route path="studio" element={<Studio />} />
              <Route path="studio/new" element={<CourseEditor />} />
              <Route path="studio/:courseId" element={<CourseEditor />} />
            </Route>
            <Route
              path="*"
              element={
                <div className="page">
                  <EmptyState
                    title="A page yet to be written."
                    description="This page doesn’t exist. Let’s find you something worth exploring."
                    to="/"
                    action="Back to discover"
                  />
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
