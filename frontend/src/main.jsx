import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const savedTheme = localStorage.getItem('crm_theme');
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
