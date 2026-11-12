import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PantryEntry } from '../../data/pantry';
import { sampleRecipes } from '../../test/fixtures';
import { PantryPage } from './PantryPage';

const entry = (label: string): PantryEntry => ({ normalized: label.toLowerCase(), label });

let items: PantryEntry[] = [];
const staples = ['Sel', 'Poivre', "Huile d'olive", 'Sucre'].map(entry);
const add = vi.fn();
const remove = vi.fn();

vi.mock('../../data/hooks', () => ({
  useRecipes: () => ({ data: sampleRecipes }),
  usePhotoUrls: () => ({ data: {} }),
  usePantryEntries: (table: string) => ({ data: table === 'pantry_items' ? items : staples }),
  usePantryMutations: () => ({
    add: { mutate: add },
    remove: { mutate: remove },
    clear: { mutate: vi.fn() },
  }),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <PantryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  items = [];
  add.mockClear();
  remove.mockClear();
});

describe('PantryPage', () => {
  it('invite à ajouter des ingrédients quand le frigo est vide', () => {
    renderPage();
    expect(screen.getByText(/Ajoutez les ingrédients que vous avez/)).toBeInTheDocument();
  });

  it('classe les recettes et liste ce qui manque', () => {
    items = ['Bavette de bœuf', 'Patate douce', 'Ail', 'Échalote', 'Persil', 'Salade'].map(entry);
    renderPage();
    const [first, second] = screen.getAllByRole('link', { name: /sur/ });
    expect(first).toHaveAccessibleName(/Bavette grillée/);
    expect(first).toHaveTextContent('Manque : piment, paprika fumé en poudre');
    expect(screen.getByLabelText('6 ingrédients sur 8')).toBeInTheDocument();
    expect(second).toHaveAccessibleName(/Azteca/);
  });

  it('ne compte pas les basiques mais compte les œufs', () => {
    items = [entry('Riz')];
    renderPage();
    expect(screen.getByRole('link', { name: /Aubergine/ })).toHaveTextContent(
      'Manque : aubergine, œuf',
    );
  });

  it('propose des suggestions et ajoute au toucher', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Ajouter un ingrédient au frigo'), {
      target: { value: 'pat' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Patate douce' }));
    expect(add).toHaveBeenCalledWith('Patate douce');
  });

  it('ajoute la saisie libre avec Entrée et retire un ingrédient', () => {
    items = [entry('Riz')];
    renderPage();
    const input = screen.getByLabelText('Ajouter un ingrédient au frigo');
    fireEvent.change(input, { target: { value: 'Courgettes' } });
    fireEvent.submit(input);
    expect(add).toHaveBeenCalledWith('Courgettes');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Riz' }));
    expect(remove).toHaveBeenCalledWith('riz');
  });
});
