import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import Home from './routes/home.tsx';
import MogulPlatinum from './routes/mogul-platinum.tsx';
import DreamstoneMysteries from './routes/dreamstone-mysteries.tsx';
import Encounters from './routes/encounters.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/mogul-platinum",
    Component: MogulPlatinum,
  },
  {
    path: "/dreamstone-mysteries",
    Component: DreamstoneMysteries,
  },
  {
    path: "/encounters",
    Component: Encounters,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />,
  </StrictMode>,
)
