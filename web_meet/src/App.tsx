import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import EncryptionComponent from './components/EncryptionComponent';
import ScreenShare from './components/ScreenShare';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Define route with dynamic 'id' parameter */}
                <Route path="/:id" element={<EncryptionComponent />} />
                <Route path="meet/:type/:phone" element={<ScreenShare />} />
            </Routes>
        </Router>
    );
};

export default App;
