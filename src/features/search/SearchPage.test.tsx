import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleRecipes } from '../../test/fixtures';
import { SearchPage } from './SearchPage';

vi.mock('../../data/hooks', () => ({
  useRecipes: () => ({ data: sampleRecipes }),
  usePhotoUrls: () => ({ data: {} }),
}));

function renderPage(path = '/recherche') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SearchPage />
    </MemoryRouter>,
  );
}

const results = () => screen.queryAllByRole('link').map((link) => link.textContent ?? '');

beforeEach(() => localStorage.clear());

describe('SearchPage', () => {
  it('cherche en tapant et explique où il a trouvé', () => {
    renderPage();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'patate' } });
    expect(screen.getByText('2 recettes')).toBeInTheDocument();
    const [first, second] = results();
    expect(first).toContain('Bavette grillée');
    expect(second).toContain('Azteca');
    // Le mot trouvé est surligné dans le sous-titre.
    expect(screen.getAllByText('patate')[0]?.tagName).toBe('MARK');
  });

  it('indique l’ingrédient quand la correspondance n’est que là', () => {
    renderPage('/recherche?q=carottes');
    const link = screen.getByRole('link', { name: /Azteca/ });
    expect(link).toHaveTextContent('Ingrédient : Carotte');
    expect(within(link).getByText('Carotte').tagName).toBe('MARK');
  });

  it('filtre sans texte et propose de retirer les filtres quand rien ne correspond', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Note ≥ 4' }));
    expect(results()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Végétarien' }));
    expect(screen.getByText('Aucune recette ne correspond.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer les filtres' }));
    expect(results()).toHaveLength(0);
  });

  it('retient la recherche quand on ouvre une recette', () => {
    renderPage('/recherche?q=miso');
    fireEvent.click(screen.getByRole('link', { name: /Aubergine/ }));
    expect(JSON.parse(localStorage.getItem('popote.recentSearches') ?? '[]')).toEqual(['miso']);
  });
});
