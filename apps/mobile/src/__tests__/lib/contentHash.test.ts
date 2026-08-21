import { computeContentHash } from '../../lib/contentHash';

describe('Content Hash Utility', () => {
  it('generates deterministic SHA-256 hash for source text', async () => {
    const text = 'Photosynthesis converts light into chemical energy in chloroplasts.';
    const hash1 = await computeContentHash(text, 'en');
    const hash2 = await computeContentHash(text, 'en');
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(64);
  });

  it('normalizes CRLF and surrounding whitespace before hashing', async () => {
    const text1 = "  Cellular respiration breaks down glucose.  \r\n";
    const text2 = 'Cellular respiration breaks down glucose.';
    const hash1 = await computeContentHash(text1, 'en');
    const hash2 = await computeContentHash(text2, 'en');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different language tags', async () => {
    const text = 'Gravity pulls objects toward the center of mass.';
    const hashEn = await computeContentHash(text, 'en');
    const hashEs = await computeContentHash(text, 'es');
    expect(hashEn).not.toBe(hashEs);
  });
});
