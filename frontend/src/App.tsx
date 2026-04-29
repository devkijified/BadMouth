import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UserLayout from './layouts/UserLayout/UserLayout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Swipe from './pages/Swipe';
import MyList from './pages/MyList';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/mylist" element={<MyList />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
