import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/** New screens start at the top; history back/forward keeps the browser's own restoration. */
export function ScrollReset() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0);
  }, [pathname, type]);
  return null;
}
