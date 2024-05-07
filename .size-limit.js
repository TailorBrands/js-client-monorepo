module.exports = [
  {
    name: 'statsig-js-client',
    limit: '10 kB',
    path: 'dist/packages/combo/build/js-client/statsig-js-client.min.js',
    import: '{ StatsigClient }',
  },
  {
    name: 'statsig-js-client + web-analytics',
    limit: '12 kB',
    path: 'dist/packages/combo/build/js-client/statsig-js-client+web-analytics.min.js',
    import: '{ StatsigClient }',
  },
  {
    name: 'statsig-js-client + session-replay + web-analytics',
    limit: '35 kB',
    path: 'dist/packages/combo/build/js-client/statsig-js-client+session-replay+web-analytics.min.js',
    import: '{ StatsigClient }',
    ignore: ['rrwebRecord'],
  },
];