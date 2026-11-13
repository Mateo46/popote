import { describe, expect, it } from 'vitest';
import { exportFileName } from './exportData';

describe('exportFileName', () => {
  it('date le fichier au jour de l’export', () => {
    expect(exportFileName(new Date('2026-11-13T10:00:00Z'))).toBe('popote-2026-11-13.json');
  });
});
