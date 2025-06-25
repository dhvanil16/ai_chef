import React, { useState } from 'react';
import Hero from '../components/Hero';
import DirectQuery from '../components/DirectQuery';
import PreferenceRecipe from '../components/PreferenceRecipe';
import DirectQueryWithImage from '../components/DirectQueryWithImage';

const Home = () => {
  const [activeTab, setActiveTab] = useState('direct');

  return (
    <div>
      <Hero activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="container mx-auto px-4 py-10">
        {activeTab === 'direct' ? (
          <div className="animate-fadeIn">
            <DirectQuery />
          </div>
        ) : activeTab === 'image' ? (
          <div className="animate-fadeIn">
            <DirectQueryWithImage />
          </div>
        ) : (
          <div className="animate-fadeIn">
            <PreferenceRecipe />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-orange-50 to-gray-100 text-gray-700 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">AI Chef</h3>
            <p className="text-sm text-gray-500 mb-4">
              Your personal AI-powered recipe assistant
            </p>
            <div className="text-xs text-gray-400 mt-4 flex justify-center items-center space-x-2">
              <span>&copy; {new Date().getFullYear()} AI Chef. All rights reserved.</span>
              <span className="mx-1">|</span>
              <span>Made with <span role="img" aria-label="heart" className="text-red-500">❤️</span> by Dhvanil Patel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 