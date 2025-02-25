import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import EncryptionComponent from './components/EncryptionComponent';
import Meet from './components/Meet';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Define route with dynamic 'id' parameter */}
        <Route path="/:id" element={<EncryptionComponent />} />
        <Route path="meet/:type/:phone" element={<Meet />} />
      </Routes>
    </Router>
  );
};

export default App;
