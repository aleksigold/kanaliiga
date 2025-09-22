import { createRoot } from 'react-dom/client';
import LandingSpots from './landing-spots.js';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('No app element found');
}

createRoot(app).render(<LandingSpots />);
