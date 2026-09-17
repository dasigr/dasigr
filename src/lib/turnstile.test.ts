import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clientIpFromForwardedFor,
  describeVerifyFailure,
  isPlausibleToken,
  isVerificationAcceptable,
  parseExpectedHostnames,
  TURNSTILE_ACTION,
  verifyTurnstileToken,
  type TurnstileVerifyResult,
} from '@/lib/turnstile';

/** A result that passes every conjunct, so each test can spoil exactly one. */
const PASSING: TurnstileVerifyResult = {
  success: true,
  action: TURNSTILE_ACTION,
  hostname: 'www.dasigr.com',
};

const ALLOWED = new Set(['www.dasigr.com', 'dasigr.com']);

const accept = (result: TurnstileVerifyResult, hostnames = ALLOWED) =>
  isVerificationAcceptable({
    result,
    expectedAction: TURNSTILE_ACTION,
    expectedHostnames: hostnames,
  });

describe('parseExpectedHostnames', () => {
  it('returns an empty set for an unset or blank value', () => {
    expect(parseExpectedHostnames(undefined).size).toBe(0);
    expect(parseExpectedHostnames('').size).toBe(0);
    expect(parseExpectedHostnames('   ').size).toBe(0);
  });

  it('parses the single-hostname local value', () => {
    expect(parseExpectedHostnames('localhost')).toEqual(new Set(['localhost']));
  });

  it('parses a comma-separated list, trimming each entry', () => {
    expect(parseExpectedHostnames('www.dasigr.com, dasigr.com')).toEqual(
      new Set(['www.dasigr.com', 'dasigr.com']),
    );
  });

  it('drops empty segments rather than admitting an empty-string hostname', () => {
    // A trailing comma must not put '' into the set. It would never match a real
    // hostname, but it WOULD make size > 0 and so disarm the empty-allowlist guard.
    const parsed = parseExpectedHostnames('a,,b,  ,c,');

    expect(parsed).toEqual(new Set(['a', 'b', 'c']));
    expect(parsed.has('')).toBe(false);
  });
});

describe('isPlausibleToken — the pre-flight, not the check', () => {
  it('accepts a normal token', () => {
    expect(isPlausibleToken('0.abc123def456')).toBe(true);
  });

  it('rejects absent, empty and whitespace-only values', () => {
    for (const value of [undefined, null, '', '   ', '\t\n']) {
      expect(isPlausibleToken(value)).toBe(false);
    }
  });

  it('rejects a non-string', () => {
    for (const value of [42, true, {}, [], { token: 'x' }]) {
      expect(isPlausibleToken(value)).toBe(false);
    }
  });

  it('rejects a token over the 2048-character cap', () => {
    expect(isPlausibleToken('x'.repeat(2048))).toBe(true);
    expect(isPlausibleToken('x'.repeat(2049))).toBe(false);
  });
});

describe('isVerificationAcceptable — one test per conjunct', () => {
  it('accepts a result that satisfies all four', () => {
    expect(accept(PASSING)).toBe(true);
  });

  it('rejects an empty allowlist despite an otherwise perfect result', () => {
    // The one that catches an unset TURNSTILE_HOSTNAMES in production, and the one a
    // careless refactor removes because it looks like a redundant guard.
    expect(accept(PASSING, new Set())).toBe(false);
  });

  it('rejects success: false', () => {
    expect(accept({ ...PASSING, success: false })).toBe(false);
  });

  it('rejects a mismatched action', () => {
    // A token solved on some other Turnstile-protected surface must not work here.
    expect(accept({ ...PASSING, action: 'signup' })).toBe(false);
  });

  it('rejects an absent action', () => {
    expect(accept({ success: true, hostname: 'www.dasigr.com' })).toBe(false);
  });

  it('rejects a hostname outside the allowlist', () => {
    // A token solved on a copy of the page hosted elsewhere on the same widget.
    expect(accept({ ...PASSING, hostname: 'evil.example' })).toBe(false);
  });

  it('rejects an absent hostname', () => {
    expect(accept({ success: true, action: TURNSTILE_ACTION })).toBe(false);
  });

  it('rejects localhost against a production allowlist', () => {
    // The concrete shape of the deployment-specific rule: a production allowlist must
    // never contain localhost, so a locally solved token cannot reach production.
    expect(accept({ ...PASSING, hostname: 'localhost' })).toBe(false);
  });

  it('accepts a result carrying fields this code does not name', () => {
    // siteverify may add fields. The decision reads what it names and ignores the rest.
    const extended = {
      ...PASSING,
      challenge_ts: '2026-09-17T00:00:00.000Z',
      cdata: 'anything',
    } as TurnstileVerifyResult;

    expect(accept(extended)).toBe(true);
  });

  it('is not satisfied by success alone', () => {
    // Stated as its own test because it is the whole reason action and hostname are
    // checked: a token is valid for the WIDGET, and the widget serves several domains.
    expect(accept({ success: true })).toBe(false);
  });
});

describe('clientIpFromForwardedFor', () => {
  it('takes the first hop', () => {
    expect(clientIpFromForwardedFor('203.0.113.7, 70.41.3.18, 150.172.238.178')).toBe(
      '203.0.113.7',
    );
  });

  it('handles a single address', () => {
    expect(clientIpFromForwardedFor('203.0.113.7')).toBe('203.0.113.7');
  });

  it('returns undefined rather than an empty string when the header is absent or blank', () => {
    // So the caller omits `remoteip` entirely instead of sending something siteverify
    // will reject.
    expect(clientIpFromForwardedFor(null)).toBeUndefined();
    expect(clientIpFromForwardedFor('')).toBeUndefined();
    expect(clientIpFromForwardedFor('   ')).toBeUndefined();
    expect(clientIpFromForwardedFor(', 70.41.3.18')).toBeUndefined();
  });
});

describe('verifyTurnstileToken — the request shape', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubFetch = (implementation: typeof fetch) => {
    const spy = vi.fn(implementation);
    vi.stubGlobal('fetch', spy);
    return spy;
  };

  const ok = (body: unknown) =>
    ({
      ok: true,
      json: async () => body,
    }) as Response;

  it('posts the secret in the body, form-encoded, and returns the parsed result', async () => {
    const fetchSpy = stubFetch(async () => ok(PASSING));

    const result = await verifyTurnstileToken({
      token: '0.token',
      secret: '0xSECRET',
      remoteIp: '203.0.113.7',
    });

    expect(result).toEqual(PASSING);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('0xSECRET');
    expect(body.get('response')).toBe('0.token');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('never puts the secret in the URL', async () => {
    // A URL is logged by every proxy in the path. A form body is not.
    const fetchSpy = stubFetch(async () => ok(PASSING));

    await verifyTurnstileToken({ token: '0.token', secret: '0xSECRET' });

    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('0xSECRET');
  });

  it('omits remoteip entirely when no client IP is known', async () => {
    const fetchSpy = stubFetch(async () => ok(PASSING));

    await verifyTurnstileToken({ token: '0.token', secret: '0xSECRET' });

    const body = (fetchSpy.mock.calls[0][1] as RequestInit).body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
  });

  it('returns the result unchanged when siteverify says no', async () => {
    // A well-formed rejection is NOT the same as an unreachable endpoint, and the
    // caller is entitled to tell them apart.
    stubFetch(async () =>
      ok({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    );

    await expect(
      verifyTurnstileToken({ token: '0.spent', secret: '0xSECRET' }),
    ).resolves.toEqual({
      success: false,
      'error-codes': ['timeout-or-duplicate'],
    });
  });

  it('returns null on a non-ok HTTP response', async () => {
    stubFetch(async () => ({ ok: false, status: 503 }) as Response);

    await expect(
      verifyTurnstileToken({ token: '0.token', secret: '0xSECRET' }),
    ).resolves.toBeNull();
  });

  it('returns null when fetch throws — network, TLS, or the 10s timeout', async () => {
    stubFetch(async () => {
      throw new Error('ENOTFOUND');
    });

    await expect(
      verifyTurnstileToken({ token: '0.token', secret: '0xSECRET' }),
    ).resolves.toBeNull();
  });

  it('returns null when the body is not JSON', async () => {
    stubFetch(
      async () =>
        ({
          ok: true,
          json: async () => {
            throw new SyntaxError('Unexpected token <');
          },
        }) as unknown as Response,
    );

    await expect(
      verifyTurnstileToken({ token: '0.token', secret: '0xSECRET' }),
    ).resolves.toBeNull();
  });
});

describe('describeVerifyFailure — a log line that cannot leak the secret', () => {
  it('names an unreachable endpoint distinctly', () => {
    expect(describeVerifyFailure(null)).toBe('siteverify unreachable');
  });

  it('reports the three fields a diagnosis needs', () => {
    const line = describeVerifyFailure({
      success: false,
      action: 'contact',
      hostname: 'localhost',
      'error-codes': ['timeout-or-duplicate'],
    });

    expect(line).toContain('success=false');
    expect(line).toContain('action=contact');
    expect(line).toContain('hostname=localhost');
    expect(line).toContain('codes=timeout-or-duplicate');
  });

  it('marks absent fields rather than printing undefined', () => {
    const line = describeVerifyFailure({ success: false });

    expect(line).toContain('action=(absent)');
    expect(line).toContain('hostname=(absent)');
    expect(line).toContain('codes=(none)');
  });
});
