import { describe, expect, it } from 'vitest';

import { RESUME_ATTACHMENT_FILENAME } from '@/lib/contact-email';
import {
  RESUME_DIRECTORY,
  readResumeFile,
  resumeExists,
  resumeFilePath,
} from '@/lib/resume';

describe('resumeFilePath', () => {
  it('resolves under private/, never public/', () => {
    // The whole gate rests on this one directory name. A file under public/ is
    // served at its own URL by the static handler and nothing would look wrong.
    const path = resumeFilePath('/srv/app');

    expect(path).toBe(`/srv/app/${RESUME_DIRECTORY}/${RESUME_ATTACHMENT_FILENAME}`);
    expect(path).not.toContain('/public/');
  });

  it('names the file exactly as it arrives in the recruiter’s inbox', () => {
    // One name on disk and in the attachment means no mapping to drift.
    expect(resumeFilePath('/srv/app').endsWith(RESUME_ATTACHMENT_FILENAME)).toBe(
      true,
    );
  });
});

describe('resumeExists', () => {
  it('finds the committed resume in this repo', () => {
    // Fails the moment the PDF is moved or renamed without updating the constant —
    // which in production is an ENOENT on a lead that has already been captured.
    expect(resumeExists()).toBe(true);
  });

  it('returns false for a directory with no resume, rather than throwing', () => {
    expect(resumeExists('/nonexistent-root')).toBe(false);
  });
});

describe('readResumeFile', () => {
  it('reads a non-empty PDF', () => {
    const file = readResumeFile();

    // %PDF- is the magic number. Catches the case where the path resolves to
    // something real but not a PDF — a placeholder, an LFS pointer, an error page.
    expect(file.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(file.byteLength).toBeGreaterThan(1024);
  });

  it('throws on a missing file rather than returning an empty buffer', () => {
    // The route turns this into the §8 500 with the mailto: fallback. Silently
    // attaching zero bytes would look like success to everyone involved.
    expect(() => readResumeFile('/nonexistent-root')).toThrow();
  });
});
