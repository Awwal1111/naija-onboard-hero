import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryProvider } from "./providers/QueryProvider";

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <App />
  </QueryProvider>
);
