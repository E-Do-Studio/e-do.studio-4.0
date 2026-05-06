export default {
  routes: [
    {
      method: 'POST',
      path: '/gallery-assets/shuffle',
      handler: 'gallery-asset.shuffle',
      config: {
        policies: [],
      },
    },
  ],
};
