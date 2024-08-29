import {
  _makeDynamicConfig,
  _makeExperiment,
  _makeFeatureGate,
  _makeLayer,
} from '@statsig/client-core';

import { LocalOverrideAdapter } from '../LocalOverrideAdapter';

describe('Local Overrides', () => {
  const user = { userID: 'a-user' };
  const gate = _makeFeatureGate('a_gate', { reason: '' }, null);
  const dynamicConfig = _makeDynamicConfig('a_config', { reason: '' }, null);
  const experiment = _makeExperiment('an_experiment', { reason: '' }, null);
  const layer = _makeLayer('a_layer', { reason: '' }, null);

  let provider: LocalOverrideAdapter;

  beforeAll(() => {
    provider = new LocalOverrideAdapter();
  });

  it('returns overidden gates', () => {
    provider.overrideGate(gate.name, true);
    const overridden = provider.getGateOverride(gate, user);
    expect(overridden?.value).toBe(true);
  });

  it('returns overidden dynamic configs', () => {
    provider.overrideDynamicConfig(dynamicConfig.name, { dc: 'value' });
    const overridden = provider.getDynamicConfigOverride(dynamicConfig, user);
    expect(overridden?.value).toEqual({ dc: 'value' });
  });

  it('returns overidden experiment', () => {
    provider.overrideExperiment(experiment.name, { exp: 'value' });
    const overridden = provider.getExperimentOverride(experiment, user);
    expect(overridden?.value).toEqual({ exp: 'value' });
  });

  it('returns overidden layer', () => {
    provider.overrideLayer(layer.name, { layer_key: 'value' });
    const overridden = provider.getLayerOverride(layer, user);
    expect(overridden?.__value).toEqual({ layer_key: 'value' });
  });

  it('returns all overrides', () => {
    provider.overrideGate(gate.name, true);
    provider.overrideDynamicConfig(dynamicConfig.name, { dc: 'value' });
    provider.overrideExperiment(experiment.name, { exp: 'value' });
    provider.overrideLayer(layer.name, { layer_key: 'value' });

    expect(provider.getAllOverrides()).toEqual({
      dynamicConfig: { a_config: { dc: 'value' } },
      experiment: { an_experiment: { exp: 'value' } },
      gate: { a_gate: true },
      layer: { a_layer: { layer_key: 'value' } },
    });
  });

  it('returns removes all overrides', () => {
    provider.overrideGate(gate.name, true);
    provider.overrideDynamicConfig(dynamicConfig.name, { dc: 'value' });
    provider.overrideExperiment(experiment.name, { exp: 'value' });
    provider.overrideLayer(layer.name, { layer_key: 'value' });

    provider.removeAllOverrides();

    expect(provider.getAllOverrides()).toEqual({
      dynamicConfig: {},
      experiment: {},
      gate: {},
      layer: {},
    });
  });

  it('removes single gate overrides', () => {
    provider.overrideGate('gate_a', true);
    provider.overrideGate('gate_b', true);

    provider.removeGateOverride('gate_a');

    expect(provider.getAllOverrides().gate).toEqual({ gate_b: true });
  });

  it('removes single dynamic config overrides', () => {
    provider.overrideDynamicConfig('config_a', { a: 1 });
    provider.overrideDynamicConfig('config_b', { b: 2 });

    provider.removeDynamicConfigOverride('config_a');

    expect(provider.getAllOverrides().dynamicConfig).toEqual({
      config_b: { b: 2 },
    });
  });

  it('removes single experiment overrides', () => {
    provider.overrideExperiment('experiment_a', { a: 1 });
    provider.overrideExperiment('experiment_b', { b: 2 });

    provider.removeExperimentOverride('experiment_a');

    expect(provider.getAllOverrides().experiment).toEqual({
      experiment_b: { b: 2 },
    });
  });

  it('removes single layer overrides', () => {
    provider.overrideLayer('layer_a', { a: 1 });
    provider.overrideLayer('layer_b', { b: 2 });

    provider.removeLayerOverride('layer_a');

    expect(provider.getAllOverrides().layer).toEqual({
      layer_b: { b: 2 },
    });
  });
});
