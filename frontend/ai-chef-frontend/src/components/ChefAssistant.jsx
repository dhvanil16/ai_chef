import React, { useState, useEffect, useRef } from 'react';
import { assistantChat } from '../utils/api';

const ChefAssistant = ({ recipe, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  
  // For speech recognition
  const recognition = useRef(null);
  
  // Preload speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        // This will trigger loading the voices
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          setVoicesLoaded(true);
          console.log("Speech synthesis voices loaded:", voices.length);
        } else {
          // If voices aren't available yet, wait for the voiceschanged event
          window.speechSynthesis.onvoiceschanged = () => {
            setVoicesLoaded(true);
            console.log("Speech synthesis voices loaded from event:", window.speechSynthesis.getVoices().length);
            window.speechSynthesis.onvoiceschanged = null;
          };
        }
      }
    };
    
    loadVoices();
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);
  
  // Initialize the assistant when the component mounts or recipe changes
  useEffect(() => {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Reset state for new recipe
    setMessages([]);
    setCurrentStep(0);
    setInputText('');
    
    // Generate a unique session ID for this conversation
    const newSessionId = `${recipe.id}-${Date.now()}`;
    setSessionId(newSessionId);
    
    // Add welcome message
    const welcomeMessage = {
      text: `Hello! I'm your cooking assistant for ${recipe.recipe_name}. Are you ready to start cooking?`,
      sender: 'assistant'
    };
    setMessages([welcomeMessage]);
    
    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      
      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleUserMessage(transcript);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
    
    // Speak the welcome message with a delay to ensure component is fully mounted
    const welcomeTimer = setTimeout(() => {
      speakText(welcomeMessage.text);
    }, 500);
    
    // Add a backup attempt in case the first one fails
    const retryTimer = setTimeout(() => {
      if (!window.speechSynthesis.speaking && !isSpeaking) {
        console.log("Retrying welcome speech...");
        speakText(welcomeMessage.text);
      }
    }, 1500);
    
    // Cleanup on component unmount
    return () => {
      if (recognition.current) {
        recognition.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      clearTimeout(welcomeTimer);
      clearTimeout(retryTimer);
    };
  }, [recipe.id]); // Depend on recipe.id to reset when recipe changes
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to handle user input
  const handleUserMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message to chat
    const userMessage = { text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    try {
      // Make API call to assistant
      const data = await assistantChat(text, sessionId, recipe, currentStep);
      
      // Add assistant response to chat
      const assistantMessage = { text: data.response, sender: 'assistant' };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update current step if returned in the response
      if (data.currentStep !== undefined) {
        setCurrentStep(data.currentStep);
      }
      
      // Speak the assistant response
      speakText(data.response);
    } catch (error) {
      console.error('Error communicating with assistant:', error);
      const errorMessage = { 
        text: 'Sorry, I had trouble processing that. Please try again.', 
        sender: 'assistant'
      };
      setMessages(prev => [...prev, errorMessage]);
      speakText(errorMessage.text);
    }
  };
  
  // Function to toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      try {
        recognition.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };
  
  // Function to speak text
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Add a small delay to ensure speech synthesis is ready
    setTimeout(() => {
      try {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find an English voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer English voices
          const englishVoices = voices.filter(voice => 
            voice.lang.includes('en-') && !voice.name.includes('Microsoft')
          );
          
          // Use any English voice or fall back to the first available voice
          if (englishVoices.length > 0) {
            utterance.voice = englishVoices[0];
          } else if (voices.length > 0) {
            utterance.voice = voices[0];
          }
          
          // Set properties for better clarity
          utterance.rate = 1.0; // Normal speed
          utterance.pitch = 1.0; // Normal pitch
          utterance.volume = 1.0; // Full volume
        }
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error in speech synthesis:', error);
        setIsSpeaking(false);
      }
    }, 300); // 300ms delay for better reliability
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleUserMessage(inputText);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 text-white rounded-t-xl p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Chef Assistant - {recipe.recipe_name}</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`mb-4 ${msg.sender === 'assistant' ? 'mr-12' : 'ml-12'}`}
            >
              <div className={`p-3 rounded-lg ${
                msg.sender === 'assistant' 
                  ? 'bg-orange-100 text-gray-800' 
                  : 'bg-blue-600 text-white ml-auto'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 flex">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button 
            type="submit" 
            className="p-2 bg-orange-500 text-white rounded-r-lg hover:bg-orange-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChefAssistant; 