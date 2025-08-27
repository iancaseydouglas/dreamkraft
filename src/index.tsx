/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This polyfill script must run before any other modules are imported
// to ensure that the Gemini API client can initialize correctly.
// It sources the API key from Vite's dev server or a runtime-injected script.
const apiKey = import.meta.env.VITE_API_KEY || (window.injectedEnv?.API_KEY && window.injectedEnv?.API_KEY !== '${API_KEY}' ? window.injectedEnv.API_KEY : undefined);

if (apiKey) {
  // The Gemini SDK expects to find the API key in `process.env.API_KEY`.
  // Vite does not expose Node.js's `process` object directly, but provides
  // `process.env`. We populate the key here to make it available to the SDK.
  process.env.API_KEY = apiKey;
} else {
    // If no API key is found, log a clear error to the console
    // to aid in debugging, instead of letting the app crash silently.
    console.error("FATAL: Gemini API Key is not configured. The application cannot start. Please refer to the README for setup instructions.");
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
