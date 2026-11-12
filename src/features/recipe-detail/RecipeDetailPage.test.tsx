import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '../../domain/recipe';
import { RecipeDetailPage } from './RecipeDetailPage';

const recipe: Recipe = {
  id: 'r1',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  title: 'Bavette et beurre aux fines herbes',
  subtitle: 'Avec des tomates au four',
  description: null,
  source: 'hellofresh',
  sourceUrl: 'https://www.hellofresh.fr/recipes/bavette-5d53de8f162d6f000d5dac5a',
  hellofreshId: '5d53de8f162d6f000d5dac5a',
  prepMinutes: 35,
  totalMinutes: null,
  difficulty: 2,
  servings: 2,
  tags: [],
  allergens: ['Gluten'],
  utensils: [],
  ingredients: [
    {
      name: 'Bavette de bœuf',
      normalized: 'bavette de boeuf',
      quantity: 240,
      unit: 'g',
      shipped: true,
    },
    { name: 'Beurre', normalized: 'beurre', quantity: 2, unit: 'cs', shipped: false },
  ],
  steps: [{ text: 'Préchauffez le four à 200 °C.', image_path: null }],
  nutrition: { kcal: 941, salt: 0.4 },
  rating: 4,
  comment: 'Doubler le beurre.',
  coverPhotoId: null,
  photos: [],
  cookLog: [{ id: 'c1', cookedOn: '2026-10-18' }],
};

const setRating = vi.fn();
const mutation = (mutate = vi.fn()) => ({ mutate, isPending: false, isError: false, error: null });

vi.mock('../../data/hooks', () => ({
  useRecipe: () => ({ data: recipe, isPending: false }),
  usePhotoUrls: () => ({ data: {} }),
  useDeleteRecipe: () => mutation(),
  useSetRating: () => mutation(setRating),
  useSetComment: () => mutation(),
  useAddCookEntry: () => mutation(),
  useDeleteCookEntry: () => mutation(),
  useUploadPhotos: () => mutation(),
  useSetCover: () => mutation(),
  useDeletePhoto: () => mutation(),
}));

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/recettes/r1']}>
      <Routes>
        <Route path="/recettes/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => setRating.mockClear());

describe('RecipeDetailPage', () => {
  it('affiche les chiffres clés, la note et le commentaire', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: recipe.title })).toBeInTheDocument();
    expect(screen.getByText('35 min')).toBeInTheDocument();
    expect(screen.getByText('Moyen')).toBeInTheDocument();
    expect(screen.getByText('941')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Note de la recette' })).toHaveAttribute(
      'aria-valuetext',
      '4 sur 5',
    );
    expect(screen.getByText(/Doubler le beurre/)).toBeInTheDocument();
  });

  it('sépare les ingrédients livrés de ceux à avoir chez soi', () => {
    renderPage();
    const pantry = screen.getByRole('heading', { name: 'À avoir chez soi' }).closest('section');
    expect(pantry).not.toBeNull();
    expect(within(pantry as HTMLElement).getByText('Beurre')).toBeInTheDocument();
    expect(within(pantry as HTMLElement).getByText('2 c. à s.')).toBeInTheDocument();
    expect(within(pantry as HTMLElement).queryByText('Bavette de bœuf')).toBeNull();
  });

  it('enregistre la note au clavier', () => {
    renderPage();
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(setRating).toHaveBeenCalledWith({ id: 'r1', rating: 4.5 });
  });

  it('affiche l’historique et le lien vers HelloFresh', () => {
    renderPage();
    expect(screen.getByText('Dimanche 18 octobre 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir sur hellofresh.fr/ })).toHaveAttribute(
      'href',
      recipe.sourceUrl,
    );
  });
});
