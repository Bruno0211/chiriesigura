// Usage: NAC_TOKEN=... SMOKE_PHONE=+3637... pnpm tsx scripts/nokia-smoke.ts
// Calls Nokia directly (not through the mode switch) for one simulator number and prints the results.
import { nokiaNetwork } from '../lib/network/nokia';

const phone = process.env.SMOKE_PHONE;
if (!phone) throw new Error('Set SMOKE_PHONE to a Nokia simulator number from the NaC dashboard');

console.log('simSwapped(168h):', await nokiaNetwork.simSwapped(phone, 168));
console.log('verifyLocation:', await nokiaNetwork.verifyLocation(phone, { lat: 45.7489, lng: 21.2087, radiusM: Number(process.env.LOCATION_RADIUS_M ?? 2000) }));
console.log('kycMatch:', await nokiaNetwork.kycMatch(phone, { givenName: 'Test', familyName: 'User', birthdate: '2000-01-01', idDocument: 'X' }));
