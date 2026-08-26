import { describe, expect, it } from 'vitest';

import {
  CONTACT_LIMITS,
  parseContact,
  type ContactInput,
} from '@/lib/contact-schema';

/**
 * A submission that passes, used as the base every case mutates one field of. If a
 * test fails here rather than in its own assertion, the FR-6 table changed.
 */
const VALID: Record<string, unknown> = {
  name: 'Jane Recruiter',
  email: 'jane@example.com',
  company: 'Acme Corp',
  message: 'We have a senior React role that fits your background.',
  requestResume: true,
  consent: true,
  _website: '',
};

const submission = (overrides: Record<string, unknown> = {}) => ({
  ...VALID,
  ...overrides,
});

/** A valid submission with one key absent — not present-but-undefined. */
const without = (field: string): Record<string, unknown> => {
  const partial = { ...VALID };
  delete partial[field];
  return partial;
};

describe('parseContact — the happy path', () => {
  it('accepts the §8 example request body', () => {
    const result = parseContact(submission());

    expect(result.success).toBe(true);
  });

  it('trims whitespace so it cannot satisfy a length rule', () => {
    const result = parseContact(
      submission({ name: '  Jane Recruiter  ', message: `  ${VALID.message}  ` }),
    );

    expect(result.success && result.data.name).toBe('Jane Recruiter');
    expect(result.success && result.data.message).toBe(VALID.message);
  });

  it('accepts an absent company — it is the only optional field', () => {
    expect(parseContact(without('company')).success).toBe(true);
  });

  it('accepts an empty company string, which is what the form actually sends', () => {
    expect(parseContact(submission({ company: '' })).success).toBe(true);
  });

  it('accepts requestResume:false — an inquiry with no PDF is valid (§8)', () => {
    const result = parseContact(submission({ requestResume: false }));

    expect(result.success && result.data.requestResume).toBe(false);
  });
});

describe('parseContact — FR-6 boundaries', () => {
  // Table-driven so a changed limit fails loudly rather than leaving a test that
  // still passes against the old number.
  const cases: Array<{
    field: keyof ContactInput;
    label: string;
    value: unknown;
    valid: boolean;
  }> = [
    { field: 'name', label: 'one below the minimum', value: 'J', valid: false },
    { field: 'name', label: 'exactly the minimum', value: 'Jo', valid: true },
    {
      field: 'name',
      label: 'exactly the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.nameMax),
      valid: true,
    },
    {
      field: 'name',
      label: 'one over the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.nameMax + 1),
      valid: false,
    },
    {
      field: 'message',
      label: 'one below the minimum',
      value: 'x'.repeat(CONTACT_LIMITS.messageMin - 1),
      valid: false,
    },
    {
      field: 'message',
      label: 'exactly the minimum',
      value: 'x'.repeat(CONTACT_LIMITS.messageMin),
      valid: true,
    },
    {
      field: 'message',
      label: 'exactly the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.messageMax),
      valid: true,
    },
    {
      field: 'message',
      label: 'one over the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.messageMax + 1),
      valid: false,
    },
    {
      field: 'company',
      label: 'exactly the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.companyMax),
      valid: true,
    },
    {
      field: 'company',
      label: 'one over the maximum',
      value: 'x'.repeat(CONTACT_LIMITS.companyMax + 1),
      valid: false,
    },
  ];

  it.each(cases)('$field, $label → $valid', ({ field, value, valid }) => {
    expect(parseContact(submission({ [field]: value })).success).toBe(valid);
  });

  it('counts length after trimming, not before', () => {
    // 12 characters, 8 of them spaces. Passes a naive length check, fails FR-6.
    expect(parseContact(submission({ message: '    abcd    ' })).success).toBe(
      false,
    );
  });
});

describe('parseContact — email', () => {
  it.each([
    'jane@example.com',
    'jane.recruiter+role@sub.example.co.uk',
    "o'brien@example.com",
  ])('accepts %s', (email) => {
    expect(parseContact(submission({ email })).success).toBe(true);
  });

  it.each(['', 'jane', 'jane@', '@example.com', 'jane@example', 'jane @a.com'])(
    'rejects %s',
    (email) => {
      expect(parseContact(submission({ email })).success).toBe(false);
    },
  );

  it('reports the §8 message verbatim', () => {
    const result = parseContact(submission({ email: 'not-an-email' }));

    expect(result.success).toBe(false);
    expect(!result.success && result.errors.email).toBe('Invalid email address');
  });
});

describe('parseContact — consent is the gate', () => {
  it('rejects an unticked box, which is the default state', () => {
    const result = parseContact(submission({ consent: false }));

    expect(result.success).toBe(false);
    expect(!result.success && result.errors.consent).toBeDefined();
  });

  it('rejects a missing consent key rather than treating absence as agreement', () => {
    expect(parseContact(without('consent')).success).toBe(false);
  });

  it.each([
    ['string "true"', 'true'],
    ['number 1', 1],
    ['null', null],
  ])('rejects %s — only the boolean counts', (_label, consent) => {
    expect(parseContact(submission({ consent })).success).toBe(false);
  });
});

describe('parseContact — the honeypot is accepted and ignored', () => {
  // The rejection is deliberately not implemented in this feature. What matters
  // here is that a filled honeypot does NOT produce a 400: an error would be its
  // own tell, and §8 requires a caught bot to see a response identical to success.
  it('accepts a filled _website', () => {
    expect(
      parseContact(submission({ _website: 'https://spam.example' })).success,
    ).toBe(true);
  });

  it('accepts a missing _website', () => {
    expect(parseContact(without('_website')).success).toBe(true);
  });
});

describe('parseContact — malformed input', () => {
  it.each([
    ['null', null],
    ['a string', 'name=jane'],
    ['an array', []],
    ['undefined', undefined],
  ])('rejects %s without throwing', (_label, input) => {
    expect(parseContact(input).success).toBe(false);
  });

  it('reports one error per field, first failure wins', () => {
    const result = parseContact({ requestResume: true, consent: false });

    expect(result.success).toBe(false);
    if (result.success) return;

    // Every required field named, each with exactly one message.
    expect(Object.keys(result.errors).sort()).toEqual([
      'consent',
      'email',
      'message',
      'name',
    ]);
    for (const message of Object.values(result.errors)) {
      expect(typeof message).toBe('string');
    }
  });

  it('drops unknown keys rather than passing them to the email builders', () => {
    const result = parseContact(submission({ isAdmin: true }));

    expect(result.success).toBe(true);
    expect(result.success && 'isAdmin' in result.data).toBe(false);
  });
});
