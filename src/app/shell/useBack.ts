import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/** Back control: history when the app has somewhere to go back to, otherwise the given fallback route. */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
