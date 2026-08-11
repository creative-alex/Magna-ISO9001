import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import { UserProvider } from "./context/userContext";
import { TutorialProvider } from "./context/tutorialContext";
import { FavoritesProvider } from "./context/favoritesContext";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
   <UserProvider>
      <FavoritesProvider>
        <TutorialProvider>
          <Router>
            <App />
          </Router>
        </TutorialProvider>
      </FavoritesProvider>
    </UserProvider>
);

reportWebVitals();
