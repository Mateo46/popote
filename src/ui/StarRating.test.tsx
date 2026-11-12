import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StarRating } from './StarRating';
import { ratingFromPointer } from './rating';

describe('ratingFromPointer', () => {
  it('moitié gauche = demi-étoile, moitié droite = étoile entière', () => {
    expect(ratingFromPointer(3, 0.2, null)).toBe(3.5);
    expect(ratingFromPointer(3, 0.8, null)).toBe(4);
  });

  it('toucher la note actuelle l’efface', () => {
    expect(ratingFromPointer(3, 0.8, 4)).toBeNull();
  });
});

describe('StarRating', () => {
  it('annonce la note à VoiceOver', () => {
    render(<StarRating value={4.5} onChange={() => {}} label="Note" />);
    expect(screen.getByRole('slider', { name: 'Note' })).toHaveAttribute(
      'aria-valuetext',
      '4,5 sur 5',
    );
  });

  it('se règle au clavier par demi-étoile', () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} label="Note" />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it('descendre sous une demi-étoile efface la note', () => {
    const onChange = vi.fn();
    render(<StarRating value={0.5} onChange={onChange} label="Note" />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
