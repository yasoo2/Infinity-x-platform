import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
      <div className="text-xl font-bold">JOE</div>
      <nav>
        <Link to="/dashboard" className="text-white hover:text-gray-300">Dashboard</Link>
      </nav>
    </header>
  );
};

export default Header;
