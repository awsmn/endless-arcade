import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for auto-updating offline caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, auto-updating...');
  },
  onOfflineReady() {
    console.log('Unlimited Games is ready to work offline!');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
