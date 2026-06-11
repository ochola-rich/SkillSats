import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';

// Placeholder route components styled with the requested dark theme
const Home = () => <div className="p-8"><h1 className="text-2xl font-bold text-white mb-4">Courses</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400">Course grid goes here...</div></div>;
const Login = () => <div className="p-8 max-w-md mx-auto"><h1 className="text-2xl font-bold text-white mb-4">Login</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400">Login form goes here...</div></div>;
const Register = () => <div className="p-8 max-w-md mx-auto"><h1 className="text-2xl font-bold text-white mb-4">Register</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400">Registration form goes here...</div></div>;
const VideoPlayer = () => <div className="p-8"><h1 className="text-2xl font-bold text-white mb-4">Video Player & Paywall</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400 aspect-video flex items-center justify-center">QR Code / Player goes here...</div></div>;
const Earn = () => <div className="p-8"><h1 className="text-2xl font-bold text-yellow-400 mb-4">Earn Sats</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400 aspect-video flex items-center justify-center">Ad video player goes here...</div></div>;
const Dashboard = () => <div className="p-8"><h1 className="text-2xl font-bold text-white mb-4">Creator Dashboard</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400">Upload form and stats go here...</div></div>;
const Wallet = () => <div className="p-8 max-w-xl mx-auto"><h1 className="text-2xl font-bold text-white mb-4">Wallet</h1><div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-gray-400">Balance and withdraw form go here...</div></div>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Main wrapper applying the bg-gray-950 theme requirement */}
        <div className="min-h-screen bg-gray-950 font-sans text-white">
          <Navbar />
          <main className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/learn/:videoId" element={<VideoPlayer />} />
              <Route path="/earn" element={<Earn />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/wallet" element={<Wallet />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;