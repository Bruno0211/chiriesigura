# Network as Code SDK facts used in this repo

Package: network-as-code (pinned 10.0.0). Client: `new NetworkAsCodeApiClient({ apiKey, rapidapiHost })`. The apiKey is the NAC_TOKEN value. rapidapiHost is `network-as-code.nokia.rapidapi.com`.

SDK calls used by lib/network/nokia.ts:
- `oauth.getClientCredentials()` returns `client_id` and `client_secret` for the app.
- `wellKnownMetadata.getOpenidConfiguration()` returns `authorization_endpoint` and `token_endpoint`.
- `kyc.match({ phoneNumber, givenName, familyName, birthdate, idDocument })` returns `nameMatch`, `givenNameMatch`, `familyNameMatch`, `birthdateMatch`, `idDocumentMatch` as 'true' or 'false' strings. The name passes when nameMatch is true, or when both given and family name match.
- `simSwap.check({ phoneNumber, maxAge })` returns `swapped`.
- `location.verify({ device: { phoneNumber }, area, maxAge })` returns `verificationResult`. The generated Area type omits the CAMARA circle fields (areaType CIRCLE, center latitude and longitude, radius), so the adapter casts it.
- `numberVerification.verifyV2({ body: { phoneNumber } }, { headers: { Authorization: 'Bearer token' } })` returns `devicePhoneNumberVerified`. The bearer token comes from the token exchange.

Number verification flow:
1. Start: authorize URL with response_type code, client_id, redirect_uri, scope `dpv:FraudPreventionAndDetection number-verification:verify`, state, login_hint set to the phone.
2. Callback: an empty code means the redirect did not reach the operator (treated as wifi). An error param such as access_denied means the person declined. Otherwise exchange the code at token_endpoint with grant_type authorization_code, the same redirect_uri, client_id and client_secret, then call verifyV2.

Test approach: `vi.mock('network-as-code')` with a hoisted client object, and `vi.stubGlobal('fetch', ...)` for the token endpoint. Assert the host header, the redirect_uri in both steps, and the v2 call.

Mock fixtures (lib/network mock, used when NETWORK_MODE is mock): +40700000001 passes everything, +40700000002 has a swapped SIM, +40700000003 fails the ID match, +40700000004 is away from the address (FALSE), +40700000005 is partial (PARTIAL), +40700000006 is on Wi-Fi for number verification. Students and unknown numbers pass.
