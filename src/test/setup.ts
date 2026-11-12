// Ajoute les assertions DOM de Testing Library (toBeInTheDocument, etc.) à Vitest.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest n'expose pas `afterEach` en global ici : on démonte explicitement les composants
// rendus après chaque test, pour que les tests restent indépendants.
afterEach(() => cleanup());
