import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <span className="text-yellow-400 text-2xl">⚡</span>
          <span>
            Sats<span className="text-yellow-400">Learn</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-300 hover:text-yellow-400 transition-colors">
            Courses
          </Link>
          <Link to="/earn" className="text-gray-300 hover:text-yellow-400 transition-colors">
            Earn
          </Link>

          {user?.role === "CREATOR" && (
            <Link to="/dashboard" className="text-gray-300 hover:text-yellow-400 transition-colors">
              Dashboard
            </Link>
          )}

          <div className="flex items-center gap-4 border-l border-gray-700 pl-4">
            {user ? (
              <>
                <Link
                  to="/wallet"
                  className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <span className="text-yellow-400">⚡</span>
                  <span className="text-white font-medium">
                    {user.balanceSats?.toLocaleString() || 0} sats
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-yellow-400 text-gray-950 px-4 py-2 rounded-md font-medium hover:bg-yellow-500 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
