import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

import { LogLevel } from '@sigstat/core';
import {
  DelayedNetworkEvaluationsDataProvider,
  LocalStorageCacheEvaluationsDataProvider,
  PrecomputedEvaluationsClient,
} from '@sigstat/precomputed-evaluations';
import { StatsigProvider, useGate } from '@sigstat/react-bindings';

const DEMO_CLIENT_KEY = 'client-rfLvYGag3eyU0jYW5zcIJTQip7GXxSrhOFN69IGMjvq';

const user = { userID: 'a-user' };

const client = new PrecomputedEvaluationsClient(DEMO_CLIENT_KEY, user, {
  logLevel: LogLevel.Info,
  dataProviders: [
    new LocalStorageCacheEvaluationsDataProvider(),
    DelayedNetworkEvaluationsDataProvider.create(),
  ],
});

function Content() {
  const gate = useGate('partial_gate');

  return (
    <Box display="flex" flexDirection="column">
      <Typography>partial_gate</Typography>
      <Typography> - Result: {gate.value ? 'Pass' : 'Fail'}</Typography>
      <Typography> - Source: {gate.source}</Typography>
    </Box>
  );
}

export default function DelayedNetworkInitExamplePage(): ReactNode {
  return (
    <StatsigProvider client={client}>
      <Content />
    </StatsigProvider>
  );
}
