import { StatsigUser } from '@sigstat/core';

export type EvaluationSource =
  | 'Uninitialized'
  | 'Loading'
  | 'NoValues'
  | 'Cache'
  | 'Network'
  | 'Bootstrap'
  | 'Prefetch';

export interface EvaluationDataProviderInterface {
  getEvaluationsData(sdkKey: string, user: StatsigUser): Promise<string | null>;

  setEvaluationsData(
    sdkKey: string,
    user: StatsigUser,
    data: string,
  ): Promise<void>;

  source(): EvaluationSource;

  isTerminal(): boolean;

  runsPostInit(): boolean;
}
