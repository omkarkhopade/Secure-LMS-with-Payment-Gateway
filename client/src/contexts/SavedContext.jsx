import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
const SavedContext = createContext(null);
function read(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data)
      ? data.filter((c) => c && typeof c._id === 'string').slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function SavedProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const key = `forma:saved:${user?._id || 'guest'}`;
  const [state, setState] = useState(() => ({ key, items: read(key) }));
  const items = state.key === key ? state.items : read(key);
  useEffect(() => {
    setState({ key, items: read(key) });
  }, [key]);
  function toggle(course) {
    const exists = items.some((item) => item._id === course._id);
    const next = exists
      ? items.filter((item) => item._id !== course._id)
      : [
          ...items,
          {
            _id: course._id,
            title: course.title,
            thumbnail: course.thumbnail,
            category: course.category,
            level: course.level,
            price: course.price,
            instructor: { name: course.instructor?.name },
            totalLectures: course.totalLectures,
            totalDuration: course.totalDuration,
          },
        ].slice(-100);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setState({ key, items: next });
      toast(exists ? 'Removed from your saved courses' : 'Saved for your next chapter');
    } catch {
      toast('Your browser could not save this course. Check your storage settings.');
    }
  }
  return (
    <SavedContext.Provider
      value={{ items, toggle, isSaved: (id) => items.some((item) => item._id === id) }}
    >
      {children}
    </SavedContext.Provider>
  );
}
export const useSaved = () => useContext(SavedContext);
