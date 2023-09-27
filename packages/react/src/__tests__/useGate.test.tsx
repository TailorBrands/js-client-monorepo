/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import StatsigProvider from '../StatsigProvider';
import useGate from '../useGate';
import {
  TestPromise,
  MockRemoteServerEvalClient,
} from '@dloomb-client/test-helpers';

const GateComponent = () => {
  const { value } = useGate('a_gate');
  return <div data-testid="gate-value">{String(value)}</div>;
};

describe('useGate', () => {
  let promise: TestPromise<void>;

  beforeEach(() => {
    promise = TestPromise.create<void>();

    const client = MockRemoteServerEvalClient.create();
    client.initialize.mockResolvedValue(promise);
    client.checkGate.mockReturnValue(true);

    render(
      <StatsigProvider client={client}>
        <GateComponent />
      </StatsigProvider>,
    );
  });

  it('does not render before the init promise resolves', () => {
    expect(screen.queryByTestId('gate-value')).toBeNull();
  });

  it('renders the gate value', async () => {
    promise.resolve();

    await waitFor(() => {
      const loadingText = screen.queryByTestId('gate-value');
      expect(loadingText).toBeInTheDocument();
    });
  });
});
