console.log('LUDOREACTION VERSION: 2.1 - ' + new Date().toISOString());
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OBSDock from './OBSDock.jsx'
import OBSOverlay from './OBSOverlay.jsx'

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

const RootComponent = () => {
  switch (mode) {
    case 'dock':
      return <OBSDock />;
    case 'overlay':
      return <OBSOverlay />;
    default:
      return <App />;
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
