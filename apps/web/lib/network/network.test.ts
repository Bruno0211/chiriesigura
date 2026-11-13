import { afterEach, describe, expect, it, vi } from 'vitest';
import { kycPasses, network } from './index';
import { nokiaNetwork } from './nokia';

const ID = { givenName: 'Ana', familyName: 'Pop', birthdate: '2000-01-01', idDocument: 'TM123456' };
const AREA = { lat: 45.75, lng: 21.23, radiusM: 2000 };
const n = () => network();

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NETWORK_MODE_LOCATION;
});

describe('mock network fixtures', () => {
  it('+40700000001 passes everything', async () => {
    expect(kycPasses(await n().kycMatch('+40700000001', ID))).toBe(true);
    expect(await n().simSwapped('+40700000001', 168)).toBe(false);
    expect(await n().verifyLocation('+40700000001', AREA)).toBe('TRUE');
  });
  it('+40700000002 has a swapped SIM', async () => {
    expect(await n().simSwapped('+40700000002', 168)).toBe(true);
  });
  it('+40700000003 fails the ID document match', async () => {
    const r = await n().kycMatch('+40700000003', ID);
    expect(r.idDocument).toBe('false');
    expect(kycPasses(r)).toBe(false);
  });
  it('+40700000004 is away from the address', async () => {
    expect(await n().verifyLocation('+40700000004', AREA)).toBe('FALSE');
  });
  it('+40700000005 is only partially in the area', async () => {
    expect(await n().verifyLocation('+40700000005', AREA)).toBe('PARTIAL');
  });
  it('+40700000006 is on Wi-Fi for number verification', async () => {
    expect(await n().numberVerificationFinish('+40700000006', 'mock', 's', 'http://x/cb')).toBe('wifi');
  });
  it('students and unknown numbers pass', async () => {
    for (const p of ['+40711111111', '+40711111119', '+40799999999']) {
      expect(await n().verifyLocation(p, AREA)).toBe('TRUE');
      expect(await n().numberVerificationFinish(p, 'mock', 's', 'http://x/cb')).toBe('ok');
    }
  });
  it('mock start redirects straight back with a code and the state', async () => {
    expect(await n().numberVerificationStart('+40700000001', 'http://x/cb', 'st')).toBe('http://x/cb?code=mock&state=st');
  });
});

describe('kycPasses', () => {
  it('fails when a required field is not available', () => {
    expect(kycPasses({ name: 'true', birthdate: 'not_available', idDocument: 'true' })).toBe(false);
  });
});

describe('per-API mode switch', () => {
  it('routes only location to Nokia when NETWORK_MODE_LOCATION=nokia', async () => {
    process.env.NETWORK_MODE_LOCATION = 'nokia';
    const loc = vi.spyOn(nokiaNetwork, 'verifyLocation').mockResolvedValue('PARTIAL');
    const sim = vi.spyOn(nokiaNetwork, 'simSwapped');
    expect(await n().verifyLocation('+40700000001', AREA)).toBe('PARTIAL');
    expect(await n().simSwapped('+40700000002', 168)).toBe(true);
    expect(loc).toHaveBeenCalledOnce();
    expect(sim).not.toHaveBeenCalled();
  });
});
