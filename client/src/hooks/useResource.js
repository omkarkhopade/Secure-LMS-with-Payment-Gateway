import { useCallback, useEffect, useRef, useState } from 'react';
export function useResource(loader, key) {
  const fn = useRef(loader);
  fn.current = loader;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ key, data: null, loading: true, error: null });
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({
      ...previous,
      key,
      data: previous.key === key ? previous.data : null,
      loading: true,
      error: null,
    }));
    fn.current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [key, version]);
  return state.key === key
    ? { ...state, reload }
    : { data: null, loading: true, error: null, reload };
}
