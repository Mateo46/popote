/**
 * Parcours principaux sur un écran d'iPhone : connexion, recherche, notation, et
 * contrôle d'accessibilité automatique (axe) des écrans les plus utilisés.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

async function signIn(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/connexion$/);
  await page.getByLabel('E-mail').fill('test@popote.test');
  await page.getByLabel('Mot de passe').fill('mot-de-passe-de-test');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
}

/** Aucune violation grave ou critique (contrastes, libellés, rôles…). */
async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => `${v.id} : ${v.help}`)).toEqual([]);
}

test('connexion puis liste des recettes', async ({ page }) => {
  await mockSupabase(page);
  await signIn(page);
  await expect(page.getByText('2 recettes')).toBeVisible();
  await expect(page.getByRole('link', { name: /Bò bún vietnamien/ })).toBeVisible();
  await expectAccessible(page);
});

test('recherche par ingrédient, sans accent', async ({ page }) => {
  await mockSupabase(page);
  await signIn(page);
  await page.getByRole('link', { name: 'Rechercher' }).click();
  await page.getByRole('searchbox').fill('emince');
  await expect(page.getByText('1 recette')).toBeVisible();
  await expect(page.getByRole('link', { name: /Bò bún/ })).toContainText(
    'Ingrédient : Émincés de bœuf',
  );
  await expectAccessible(page);
});

test('notation d’une recette par demi-étoile', async ({ page }) => {
  const state = await mockSupabase(page);
  await signIn(page);
  await page.getByRole('link', { name: /Azteca Bowl/ }).click();
  const stars = page.getByRole('slider', { name: 'Note de la recette' });
  await expect(stars).toHaveAttribute('aria-valuetext', 'Non notée');

  // Moitié gauche de la 4e étoile : 3,5. Le clic positionné de Playwright fait défiler
  // jusqu'à l'étoile et attend qu'elle soit stable (des coordonnées brutes pourraient
  // tomber à côté si la page bouge encore).
  const fourth = page.getByTestId('star-4');
  const box = await fourth.boundingBox();
  if (!box) throw new Error('Étoile introuvable');
  await fourth.click({ position: { x: box.width * 0.25, y: box.height / 2 } });

  await expect(stars).toHaveAttribute('aria-valuetext', '3,5 sur 5');
  await expect.poll(() => state.recipePatches).toContainEqual({ rating: 3.5 });
  await expectAccessible(page);
});

test('hors connexion : consultation seule', async ({ page, context }) => {
  await mockSupabase(page);
  await signIn(page);
  // Dans l'app installée, le service worker garde tous les écrans ; ici il est désactivé
  // (pour les mocks) : on ouvre donc la fiche une première fois en ligne.
  await page.getByRole('link', { name: /Bò bún/ }).click();
  await page.getByRole('button', { name: 'Retour' }).click();
  await context.setOffline(true);
  await expect(page.getByText('Hors connexion : consultation seule')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Indisponible hors connexion' })).toBeDisabled();
  // Les recettes déjà chargées restent consultables.
  await page.getByRole('link', { name: /Bò bún/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Bò bún vietnamien au bœuf sauté' }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Hors connexion : consultation seule')).toBeHidden();
});
