// frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// --- CORRECTION: Comment out this line ---
// import reportWebVitals from './reportWebVitals'; 
// ------------------------------------------
import { BrowserRouter } from 'react-router-dom';
import './app.css'; // <-- CORRECTION: Changed to lowercase

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// --- CORRECTION: Comment out this function call ---
// reportWebVitals();
// -----------------------------------------------