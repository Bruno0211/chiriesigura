// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SignedInPage from './page';

afterEach(cleanup);

describe('/signed-in', () => {
  it('tells the student to go back to their listing, and offers /check', () => {
    render(<SignedInPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("You're signed in");
    expect(screen.getByText(/Go back to your listing tab/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Check a listing here' }).getAttribute('href')).toBe('/check');
  });
});
