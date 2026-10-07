import { describe, expect, it } from 'vitest';
import { describeUserAgent, formatLastActive, initialsOf, splitName } from './accountFormat';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/130.0.2849.46`;
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

describe('describeUserAgent', () => {
  it('reads the operating system and full browser version', () => {
    expect(describeUserAgent(CHROME_WINDOWS)).toEqual({ os: 'Windows', browser: 'Chrome 154.0.0.0' });
    expect(describeUserAgent(FIREFOX_LINUX)).toEqual({ os: 'Linux', browser: 'Firefox 131.0' });
    expect(describeUserAgent(SAFARI_MAC)).toEqual({ os: 'macOS', browser: 'Safari 17.0' });
  });

  it('tells Edge apart from Chrome, which it also claims to be', () => {
    expect(describeUserAgent(EDGE_WINDOWS)).toEqual({ os: 'Windows', browser: 'Edge 130.0.2849.46' });
  });

  it('calls a phone a phone, not a Mac or a Linux box', () => {
    expect(describeUserAgent(SAFARI_IPHONE)).toEqual({ os: 'iOS', browser: 'Safari 17.0' });
    expect(describeUserAgent(CHROME_ANDROID)).toEqual({ os: 'Android', browser: 'Chrome 130.0.0.0' });
  });

  it('says so when it does not know', () => {
    expect(describeUserAgent('')).toEqual({ os: 'Unknown device', browser: 'Unknown browser' });
  });
});

describe('formatLastActive', () => {
  // Newer ICU versions put a narrow no-break space before AM/PM; compare with plain spaces.
  const format = (date: Date, now: Date) => formatLastActive(date, now, 'en-US').replace(/\s/g, ' ');
  const now = new Date(2026, 9, 6, 18, 0);

  it('says "Today at" for the same day', () => {
    expect(format(new Date(2026, 9, 6, 17, 19), now)).toBe('Today at 5:19 PM');
  });

  it('says "Yesterday at" for the day before, even just across midnight', () => {
    expect(format(new Date(2026, 9, 5, 9, 5), now)).toBe('Yesterday at 9:05 AM');
    expect(format(new Date(2026, 9, 5, 23, 59), new Date(2026, 9, 6, 0, 1))).toBe('Yesterday at 11:59 PM');
  });

  it('writes the date for anything older', () => {
    expect(format(new Date(2026, 9, 1, 8, 0), now)).toBe('Oct 1, 2026 at 8:00 AM');
  });
});

describe('names', () => {
  it('splits a full name into first and last', () => {
    expect(splitName('Ada Lovelace King')).toEqual({ firstName: 'Ada', lastName: 'Lovelace King' });
    expect(splitName('Cher')).toEqual({ firstName: 'Cher', lastName: '' });
    expect(splitName('  ')).toEqual({ firstName: '', lastName: '' });
  });

  it('makes up to two initials, and a placeholder for no name', () => {
    expect(initialsOf('Ada Lovelace King')).toBe('AL');
    expect(initialsOf('cher')).toBe('C');
    expect(initialsOf('')).toBe('?');
  });
});
