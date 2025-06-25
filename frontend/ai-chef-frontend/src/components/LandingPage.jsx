// src/components/LandingPage.jsx
import React from 'react';

const LandingPage = ({ onEnter }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-cover bg-center" style={{ backgroundImage: "url('https://source.unsplash.com/1600x900/?gourmet,food')" }}>
      <div className="absolute inset-0 bg-black opacity-60"></div>
      <div className="relative z-10 text-center p-6">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white">Welcome to Gourmet AI Chef</h1>
        <p className="mt-4 text-xl text-gray-200">
          Discover, generate, and perfect your recipes with AI-powered culinary magic.
        </p>
        <button 
          onClick={onEnter}
          className="mt-8 px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-full transition duration-300"
        >
          Enter the Kitchen
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
