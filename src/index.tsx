import { createRoot } from 'react-dom/client';
import LandingSpots from './components/landing-spots';
import { BrowserRouter } from 'react-router';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('No app element found');
}

createRoot(app).render(
  <BrowserRouter basename="/kanaliiga/">
    <LandingSpots />
  </BrowserRouter>,
);
