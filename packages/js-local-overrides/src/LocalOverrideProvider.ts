import {
  DynamicConfig,
  Experiment,
  FeatureGate,
  Layer,
  OverrideProvider,
  StatsigUser,
} from '@statsig/client-core';

type OverrideStore = {
  gate: Record<string, boolean>;
  dynamicConfig: Record<string, Record<string, unknown>>;
  experiment: OverrideStore['dynamicConfig'];
  layer: OverrideStore['dynamicConfig'];
};

export class LocalOverrideProvider implements OverrideProvider {
  private readonly _overrides: OverrideStore = {
    gate: {},
    dynamicConfig: {},
    experiment: {},
    layer: {},
  };

  overrideGate(name: string, value: boolean): void {
    this._overrides.gate[name] = value;
  }

  getGateOverride(
    current: FeatureGate,
    _user: StatsigUser,
  ): FeatureGate | null {
    const overridden = this._overrides.gate[current.name];
    if (overridden == null) {
      return null;
    }

    return {
      ...current,
      value: overridden,
      details: { ...current.details },
    };
  }

  overrideDynamicConfig(name: string, value: Record<string, unknown>): void {
    this._overrides.dynamicConfig[name] = value;
  }

  getDynamicConfigOverride(
    current: DynamicConfig,
    _user: StatsigUser,
  ): DynamicConfig | null {
    return this._getConfigOverride(current, this._overrides.dynamicConfig);
  }

  overrideExperiment(name: string, value: Record<string, unknown>): void {
    this._overrides.experiment[name] = value;
  }

  getExperimentOverride(
    current: Experiment,
    _user: StatsigUser,
  ): Experiment | null {
    return this._getConfigOverride(current, this._overrides.experiment);
  }

  overrideLayer(name: string, value: Record<string, unknown>): void {
    this._overrides.layer[name] = value;
  }

  getLayerOverride(current: Layer, _user: StatsigUser): Layer | null {
    const overridden = this._overrides.layer[current.name];
    if (overridden == null) {
      return null;
    }

    return {
      ...current,
      getValue: (param: string) => overridden[param],
      details: { ...current.details },
    };
  }

  private _getConfigOverride<T extends Experiment | DynamicConfig>(
    current: T,
    lookup: Record<string, Record<string, unknown>>,
  ): T | null {
    const overridden = lookup[current.name];
    if (overridden == null) {
      return null;
    }

    return {
      ...current,
      value: overridden,
      details: { ...current.details },
    };
  }
}
