import fetchMock from 'jest-fetch-mock';

import { LogLevel, StatsigClientEventData } from '@statsig/client-core';

import PrecomputedEvaluationsClient from '../PrecomputedEvaluationsClient';
import InitializeResponse from './initialize.json';

describe('Client Evaluations Callback', () => {
  const user = { userID: 'a-user' };
  let client: PrecomputedEvaluationsClient;
  let events: StatsigClientEventData[] = [];

  beforeEach(async () => {
    events = [];
    client = new PrecomputedEvaluationsClient('client-key', user, {
      logLevel: LogLevel.None,
    });

    fetchMock.enableMocks();
    fetchMock.mockResponse(JSON.stringify(InitializeResponse));

    await client.initialize();
    client.on('*', (data) => {
      if (data.event.endsWith('_evaluation')) {
        events.push(data);
      }
    });
  });

  it('fires the gate_evaluation event', () => {
    client.checkGate('a_gate');
    expect(events).toEqual([
      {
        event: 'gate_evaluation',
        gate: {
          name: 'a_gate',
          ruleID: '2QWhVkWdUEXR6Q3KYgV73O',
          source: 'Network',
          value: true,
        },
      },
    ]);
  });

  it('fires the dynamic_config_evaluation event', () => {
    client.getDynamicConfig('a_dynamic_config');
    expect(events).toEqual([
      {
        event: 'dynamic_config_evaluation',
        dynamicConfig: {
          name: 'a_dynamic_config',
          ruleID: 'default',
          source: 'Network',
          value: {
            blue: '#00FF00',
            green: '#0000FF',
            red: '#FF0000',
          },
        },
      },
    ]);
  });

  it('fires the experiment_evaluation event', () => {
    client.getExperiment('an_experiment');
    expect(events).toEqual([
      {
        event: 'experiment_evaluation',
        experiment: {
          name: 'an_experiment',
          ruleID: '49CGlTB7z97PEdqJapQplA',
          source: 'Network',
          value: {
            a_string: 'Experiment Test Value',
          },
        },
      },
    ]);
  });

  it('fires the layer_evaluation event', () => {
    client.getLayer('a_layer');
    expect(events).toEqual([
      {
        event: 'layer_evaluation',
        layer: {
          name: 'a_layer',
          ruleID: '49CGlTB7z97PEdqJapQplA',
          source: 'Network',
          getValue: expect.any(Function) as unknown,
        },
      },
    ]);
  });
});
