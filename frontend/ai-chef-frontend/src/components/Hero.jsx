import React from 'react';

const Hero = ({ activeTab, setActiveTab }) => {
  return (
    <section className="relative min-h-[500px] flex items-center justify-center py-16 md:py-20">
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <div className="mb-12">
          <div className="inline-flex items-center space-x-2 bg-orange-50 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-orange-600 font-medium">Your Taste - Our Tech</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-center leading-snug">
            <span className="block text-gray-900">Your Personal</span>
            <span className="relative z-10 bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent mt-2">
              AI Chef Assistant
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Your AI cooking partner is ready to help you create delicious, personalized recipes — anytime, anywhere!
          </p>
        </div>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <button 
            onClick={() => setActiveTab('direct')}
            className={`group relative w-full sm:w-auto px-8 py-4 rounded-2xl text-lg transition-all duration-300 ${
              activeTab === 'direct'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200/50'
                : 'bg-white text-gray-700 hover:bg-orange-50 hover:shadow-lg hover:shadow-orange-100/50'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
            <span className="relative flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Quick Recipe
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('image')}
            className={`group relative w-full sm:w-auto px-8 py-4 rounded-2xl text-lg transition-all duration-300 ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200/50'
                : 'bg-white text-gray-700 hover:bg-orange-50 hover:shadow-lg hover:shadow-orange-100/50'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
            <span className="relative flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Recipe from Image
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('preference')}
            className={`group relative w-full sm:w-auto px-8 py-4 rounded-2xl text-lg transition-all duration-300 ${
              activeTab === 'preference'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200/50'
                : 'bg-white text-gray-700 hover:bg-orange-50 hover:shadow-lg hover:shadow-orange-100/50'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
            <span className="relative flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Recipe Creator
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
