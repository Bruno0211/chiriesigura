// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentScreen } from './ConsentScreen';
import { NumberStep } from './NumberStep';
import { StepList } from './StepList';
import { maskPhone } from './flow';

afterEach(cleanup);

describe('ConsentScreen', () => {
  it('renders one line per check and the accept button is the only way forward', async () => {
    const onAccept = vi.fn();
    render(<ConsentScreen checks={['number', 'kyc', 'simswap', 'location']} onAccept={onAccept} />);

    const list = screen.getByRole('list', { name: /what will be checked/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /privacy/i }).getAttribute('href')).toBe('/privacy');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(onAccept).not.toHaveBeenCalled();
    await userEvent.click(buttons[0]!);
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('lists only the checks it is given', () => {
    render(<ConsentScreen checks={['number', 'location']} onAccept={() => {}} />);
    const list = screen.getByRole('list', { name: /what will be checked/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('NumberStep', () => {
  it('on Wi-Fi tells the user to switch to mobile data', () => {
    render(<NumberStep next="/verify" nvResult="wifi" onVerified={() => {}} />);
    expect(screen.getByText('Switch to mobile data and try again')).toBeTruthy();
  });

  it('on failure says the number could not be confirmed', () => {
    render(<NumberStep next="/verify" nvResult="fail" onVerified={() => {}} />);
    expect(screen.getByText("We couldn't confirm this phone number")).toBeTruthy();
  });

  it('calls onVerified once when the operator confirmed the number', () => {
    const onVerified = vi.fn();
    const { rerender } = render(<NumberStep next="/verify" nvResult="ok" onVerified={onVerified} />);
    rerender(<NumberStep next="/verify" nvResult="ok" onVerified={onVerified} />);
    expect(onVerified).toHaveBeenCalledOnce();
  });

  it('starts the operator check with the normalised number and the return path', async () => {
    const navigate = vi.fn();
    const onSubmit = vi.fn();
    render(<NumberStep next="/verify" nvResult={null} onVerified={() => {}} onSubmit={onSubmit} navigate={navigate} />);
    await userEvent.type(screen.getByLabelText(/your phone number/i), '0700 000 001');
    await userEvent.click(screen.getByRole('button', { name: /confirm my number/i }));
    expect(onSubmit).toHaveBeenCalledWith('+40700000001');
    expect(navigate).toHaveBeenCalledWith('/api/nv/start?phone=%2B40700000001&next=%2Fverify');
  });

  it('rejects a number it cannot read without leaving the page', async () => {
    const navigate = vi.fn();
    render(<NumberStep next="/verify" nvResult={null} onVerified={() => {}} navigate={navigate} />);
    await userEvent.type(screen.getByLabelText(/your phone number/i), '12');
    await userEvent.click(screen.getByRole('button', { name: /confirm my number/i }));
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/romanian mobile number/i);
  });
});

describe('StepList', () => {
  it('shows a passed or failed state and the message for each step', () => {
    render(
      <StepList
        steps={[
          { name: 'number', ok: true, message: 'Phone number confirmed' },
          { name: 'simswap', ok: false, message: 'This SIM was changed in the last 7 days' },
        ]}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Phone number confirmed')).toBeTruthy();
    expect(within(rows[0]!).getByText('Passed')).toBeTruthy();
    expect(within(rows[1]!).getByText('This SIM was changed in the last 7 days')).toBeTruthy();
    expect(within(rows[1]!).getByText('Failed')).toBeTruthy();
  });

  it('marks steps still running as checking', () => {
    render(<StepList steps={[]} pending={['kyc']} />);
    expect(screen.getByText('Checking')).toBeTruthy();
  });
});

describe('maskPhone', () => {
  it('keeps only the first and last digits of a Romanian number', () => {
    expect(maskPhone('+40700000001')).toBe('+40 7•• ••• 001');
  });
});
