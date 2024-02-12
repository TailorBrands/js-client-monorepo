'use client';

import { useState } from 'react';
import { StatsigUser } from 'statsig-node';

import {
  BootstrapEvaluationsDataProvider,
  PrecomputedEvaluationsClient,
} from '@sigstat/precomputed-evaluations';
import { StatsigProvider, useGate } from '@sigstat/react-bindings';

const DEMO_CLIENT_KEY = 'client-rfLvYGag3eyU0jYW5zcIJTQip7GXxSrhOFN69IGMjvq';

function Content() {
  const { value } = useGate('a_gate');
  return <>a_gate: {value ? 'Passing' : 'Failing'}</>;
}

export default function ClientApp({
  user,
  values,
}: {
  user: StatsigUser;
  values: string;
}): JSX.Element {
  const bootstrapProvider = new BootstrapEvaluationsDataProvider();
  bootstrapProvider.addDataForUser(DEMO_CLIENT_KEY, user, values);

  const [client] = useState(
    new PrecomputedEvaluationsClient(DEMO_CLIENT_KEY, user, {
      dataProviders: [bootstrapProvider],
    }),
  );

  return (
    <StatsigProvider client={client}>
      <Content />
    </StatsigProvider>
  );
}
