import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
//import EncryptionComponent from './components/EncryptionComponent';
//import ScreenShare from './components/ScreenShare';
//import Whatsapp from './components/Whatsapp';
import Web from './components/Web';
//import Audiocall from './components/Audiocall';
//import Test from './components/Test';
const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Define route with dynamic 'id' parameter */}
                {/* <Route path="/:id" element={<EncryptionComponent />} />
                <Route path="meet/:type/:phone" element={<ScreenShare />} />
                <Route path="whatsapp/:type/:phone" element={<Whatsapp />} /> */}
                { <Route path="web/:type" element={<Web />} /> }
               {/*  { <Route path="audio/:type" element={<Audiocall />} /> } */}
               {/*  <Route path="test" element={<Test />} /> */}
            </Routes>
        </Router>
    );
};

export default App;
