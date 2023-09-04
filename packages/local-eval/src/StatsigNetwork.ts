import { StatsigNetworkCore } from '@statsig/core';
import { DownloadConfigSpecsResponse } from './SpecStore';
import { SDK_TYPE } from './StatsigMetadata';

export default class StatsigNetwork extends StatsigNetworkCore {
  constructor(sdkKey: string, api: string) {
    super(sdkKey, SDK_TYPE, api);
  }

  fetchConfigSpecs(): Promise<DownloadConfigSpecsResponse> {
    return this._sendPostRequest(
      `${this._api}/download_config_specs`,
      {
        sinceTime: 0,
      },
      2000,
    );
  }
}
