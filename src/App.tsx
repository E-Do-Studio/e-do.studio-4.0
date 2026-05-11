import { RouterProvider } from '@tanstack/react-router';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { router } from './router';

const App = () => (
  <NuqsAdapter>
    <RouterProvider router={router} />
  </NuqsAdapter>
);

export default App;
