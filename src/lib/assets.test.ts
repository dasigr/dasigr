import { describe, expect, it } from 'vitest';

import { publicAssetExists } from '@/lib/assets';

describe('publicAssetExists', () => {
  it('finds a file that is actually in public/', () => {
    expect(publicAssetExists('/romualdo-dasig-profile.jpg')).toBe(true);
  });

  it('reports false for a project thumbnail that has not been taken yet', () => {
    // Every entry in mock-data names one of these; none exist. The card falls back
    // to a placeholder rather than a broken image.
    expect(publicAssetExists('/images/projects/cebufest.webp')).toBe(false);
  });

  it('refuses anything that is not a simple root-relative path', () => {
    expect(publicAssetExists('')).toBe(false);
    expect(publicAssetExists('romualdo-dasig-profile.jpg')).toBe(false);
    expect(publicAssetExists('https://example.com/a.png')).toBe(false);
    expect(publicAssetExists('//example.com/a.png')).toBe(false);
  });

  it('refuses to climb out of public/', () => {
    expect(publicAssetExists('/../package.json')).toBe(false);
    expect(publicAssetExists('/images/../../package.json')).toBe(false);
  });
});
