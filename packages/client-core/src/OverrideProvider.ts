import { DynamicConfig, Experiment, FeatureGate, Layer } from './StatsigTypes';
import { StatsigUser } from './StatsigUser';

export type OverrideProvider = {
  getGateOverride?(current: FeatureGate, user: StatsigUser): FeatureGate | null;
  getDynamicConfigOverride?(
    current: DynamicConfig,
    user: StatsigUser,
  ): DynamicConfig | null;
  getExperimentOverride?(
    current: Experiment,
    user: StatsigUser,
  ): Experiment | null;
  getLayerOverride?(current: Layer, user: StatsigUser): Layer | null;
};

export class CombinationOverrideProvider implements OverrideProvider {
  constructor(public readonly providers: OverrideProvider[]) {}

  getGateOverride(current: FeatureGate, user: StatsigUser): FeatureGate | null {
    return this._getOverride<FeatureGate>(
      (provider) => provider.getGateOverride?.(current, user) ?? null,
    );
  }

  getDynamicConfigOverride(
    current: DynamicConfig,
    user: StatsigUser,
  ): DynamicConfig | null {
    return this._getOverride<DynamicConfig>(
      (provider) => provider.getDynamicConfigOverride?.(current, user) ?? null,
    );
  }

  private _getOverride<T>(
    fn: (provider: OverrideProvider) => T | null,
  ): T | null {
    for (const provider of this.providers) {
      const override = fn(provider);
      if (override) {
        return override;
      }
    }

    return null;
  }
}
