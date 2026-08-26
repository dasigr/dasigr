import { describe, expect, it } from 'vitest';

import { publicAssetExists } from '@/lib/assets';
import { featuredProjects } from '@/lib/mock-data';

describe('publicAssetExists', () => {
  it('finds a file that is actually in public/', () => {
    expect(publicAssetExists('/romualdo-dasig-profile.jpg')).toBe(true);
  });

  it('reports false for a thumbnail that has not been taken', () => {
    // The card falls back to a placeholder rather than a broken image. Asserted
    // against a path that is never going to exist — this test previously named a
    // real project thumbnail and started failing the moment that screenshot landed,
    // which made it a record of the launch state rather than of the behaviour.
    expect(publicAssetExists('/images/projects/__not-taken__.webp')).toBe(false);
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

describe('featured project thumbnails', () => {
  // ProjectCard has no way to complain: a thumbnail that goes missing does not
  // error, it silently reverts the card to "Screenshot pending". Nothing else in
  // the suite would notice. Derived from featuredProjects so renaming a slug or
  // repointing a thumbnailUrl is caught here rather than in a browser weeks later.
  it.each(featuredProjects.map((p) => [p.slug, p.thumbnailUrl] as const))(
    '%s has its screenshot in public/',
    (_slug, thumbnailUrl) => {
      expect(publicAssetExists(thumbnailUrl)).toBe(true);
    },
  );
});
