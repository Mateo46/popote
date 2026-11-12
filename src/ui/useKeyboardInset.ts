/**
 * Hauteur du clavier iOS, pour garder une barre fixée en bas au-dessus du clavier.
 *
 * Sur iPhone, un élément `position: fixed; bottom: 0` reste derrière le clavier : on lit
 * la zone réellement visible (VisualViewport) et on expose l'écart en pixels.
 */
import { useEffect, useState } from 'react';

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
