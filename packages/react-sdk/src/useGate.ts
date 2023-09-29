import { useContext, useMemo } from 'react';

import { StatsigUser } from '@sigstat/core';

import {
  isRemoteEvaluationClient,
  logMissingStatsigUserWarning,
} from './RemoteVsLocalUtil';
import StatsigContext from './StatsigContext';

export type GateResult = {
  value: boolean;
};

type CheckGateOptions = {
  logExposure: boolean;
  user: StatsigUser | null;
};

export default function (
  gateName: string,
  options: CheckGateOptions = { logExposure: true, user: null },
): GateResult {
  const { client } = useContext(StatsigContext);

  const value = useMemo(() => {
    if (isRemoteEvaluationClient(client)) {
      return client.checkGate(gateName);
    }

    if (options.user == null) {
      logMissingStatsigUserWarning();
      return false;
    }

    return client.checkGate(options.user, gateName);
  }, [client.loadingStatus, options]);

  return {
    value,
  };
}
