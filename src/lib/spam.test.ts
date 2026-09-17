import { describe, expect, it } from 'vitest';

import {
  decideContactDelivery,
  describeHoneypotValue,
  isHoneypotTripped,
} from '@/lib/spam';

describe('isHoneypotTripped — what counts as a bot', () => {
  it('trips on any visible content', () => {
    expect(isHoneypotTripped('https://cheap-seo.example')).toBe(true);
    expect(isHoneypotTripped('x')).toBe(true);
  });

  it('does not trip on an empty string — the value a real browser sends', () => {
    expect(isHoneypotTripped('')).toBe(false);
  });

  it('does not trip on whitespace alone', () => {
    // Autofill and password managers can drop a space into a field the human never
    // saw. A false positive here is a lead lost behind a success message, which
    // FR-7a rates worse than having no gate.
    for (const value of [' ', '   ', '\t', '\n', ' \t\n ']) {
      expect(isHoneypotTripped(value)).toBe(false);
    }
  });

  it('does not trip when the field is absent', () => {
    // `_website` is z.optional() in the schema, so a non-browser client can omit it
    // entirely. Untidy, not hostile — and not this control's call.
    expect(isHoneypotTripped(undefined)).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
  });
});

describe('decideContactDelivery — the drop', () => {
  it('delivers a submission with an empty honeypot', () => {
    expect(
      decideContactDelivery({ requestResume: true, _website: '' }).deliver,
    ).toBe(true);
  });

  it('refuses to deliver a submission with a filled honeypot', () => {
    expect(
      decideContactDelivery({ requestResume: true, _website: 'spam' }).deliver,
    ).toBe(false);
  });

  it('delivers when the honeypot is absent', () => {
    expect(decideContactDelivery({ requestResume: false }).deliver).toBe(true);
  });
});

/**
 * The half of §8 that is invisible at a glance: the caught bot must not be able to
 * tell. `resumeSent` is the only part of the 200 body that varies, so parity on it
 * across the two branches is the whole of the requirement that can be asserted here
 * — the status code and the shape are structural, guaranteed by the route returning
 * both branches through one `RESPONSES.accepted` call.
 */
describe('decideContactDelivery — the rejection is indistinguishable', () => {
  const HONEYPOT_VALUES = ['', ' ', undefined, 'bot', 'https://spam.example'];

  for (const requestResume of [true, false]) {
    it(`reports resumeSent: ${requestResume} however the honeypot came back`, () => {
      const reported = HONEYPOT_VALUES.map(
        (_website) =>
          decideContactDelivery({ requestResume, _website }).resumeSent,
      );

      expect(reported).toEqual(HONEYPOT_VALUES.map(() => requestResume));
    });
  }

  it('never substitutes a fixed resumeSent for a caught bot', () => {
    // The tempting shortcut is `{ deliver: false, resumeSent: true }`. It is a tell
    // to any bot that submits with the resume box unticked and reads the body.
    const caught = decideContactDelivery({
      requestResume: false,
      _website: 'bot',
    });

    expect(caught).toEqual({ deliver: false, resumeSent: false });
  });

  it('differs from a delivered submission in the deliver flag and nothing else', () => {
    const caught = decideContactDelivery({
      requestResume: true,
      _website: 'bot',
    });
    const delivered = decideContactDelivery({
      requestResume: true,
      _website: '',
    });

    expect(Object.keys(caught).sort()).toEqual(Object.keys(delivered).sort());
    expect({ ...caught, deliver: true }).toEqual(delivered);
  });
});

describe('describeHoneypotValue — the server-side log line', () => {
  it('reports the value so an autofill accident can be told from spam', () => {
    expect(describeHoneypotValue('https://spam.example')).toBe(
      'https://spam.example',
    );
  });

  it('trims, so a whitespace value logs as empty rather than as blank space', () => {
    expect(describeHoneypotValue('  bot  ')).toBe('bot');
    expect(describeHoneypotValue('   ')).toBe('');
  });

  it('bounds the length — the field has no maxLength in the schema', () => {
    const logged = describeHoneypotValue('a'.repeat(5000));

    expect(logged).toHaveLength(81); // 80 characters plus the ellipsis
    expect(logged.endsWith('…')).toBe(true);
  });

  it('says so when the field was not sent at all', () => {
    expect(describeHoneypotValue(undefined)).toBe('(absent)');
    expect(describeHoneypotValue(null)).toBe('(absent)');
  });
});
