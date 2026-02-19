import { createRoot } from 'react-dom/client';
import LandingSpots from './components/landing-spots';
import { BrowserRouter, Route, Routes } from 'react-router';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('No app element found');
}

createRoot(app).render(
  <BrowserRouter basename="/kanaliiga/">
    <Routes>
      <Route path="/" element={<LandingSpots />} />
    </Routes>
  </BrowserRouter>,
);
