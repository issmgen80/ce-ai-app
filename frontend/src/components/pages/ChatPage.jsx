import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'
import { handleConversation, handleDataLookup, handlePrefilter, handleVectorSearch } from '../../utils/apiHandler'
import ChatResultCard from '../chat/ChatResultCard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Format claude message
const formatMessage = (text) => {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));
};

const ChatPage = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hi! I'm your AI car consultant. Tell me what you're looking for and I'll help you find the perfect vehicle!",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedResults, setExpandedResults] = useState({}) // Track which result sets are expanded
  const [currentMode, setCurrentMode] = useState(null); // 'recommendations' | 'data-lookup' | null
  const [isConversationTooLong, setIsConversationTooLong] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Execute vehicle search with backend pre-filtering + vector search
   */
  const executeSearch = async (criteria) => {
    try {
      // Step 1: Pre-filter via backend API
      const prefilterData = await handlePrefilter(
  criteria.budget,
  criteria.useCase,
  criteria.bodyType,
  criteria.fuelType,
  criteria.vectorRequirements || []
);

      // Step 2: Check for no matches
      if (!prefilterData.success) {
        const errorMsg = {
          id: Date.now(),
          role: 'assistant',
          content: prefilterData.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      // Step 3: Show searching message
      const searchingMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `Searching...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, searchingMsg]);

      // Step 4: Execute vector search via backend API
      const vectorData = await handleVectorSearch(
  prefilterData.vectorRequirements,
  prefilterData.vehicleIds
);

      if (!vectorData.success) {
        throw new Error(vectorData.error || 'Vector search failed');
      }

      // Step 5: Display results - store IN the message
      const resultsMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Here are your top recommendations, ranked by popularity in Australia:`,
        timestamp: new Date(),
        results: vectorData.results
      };

      setMessages(prev => [...prev, resultsMsg]);

    } catch (error) {
      console.error("Search error:", error);
      const errorMsg = {
        id: Date.now(),
        role: 'assistant',
        content: "Sorry, I encountered an issue processing your search. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  /**
 * Execute data lookup for specific vehicle question
 */
const executeDataLookup = async (vehicleQuery, vehicleName) => {
  try {
    console.log(`🔍 Data lookup: ${vehicleQuery}`);

    const data = await handleDataLookup(vehicleQuery, vehicleName);

    // Display answer
    const answerMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: data.answer,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, answerMsg]);
    
  } catch (error) {
    console.error("Data lookup error:", error);
    
    const errorMsg = {
      id: Date.now(),
      role: 'assistant',
      content: error.message, // Should show rate limit message
      timestamp: new Date()
    };
    setMessages(prev => [...prev, errorMsg]);
  }
};

  /**
 * Handle user message with mode detection
 */
const handleSendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;

    // Check message count limit
  if (messages.length >= 50) {
    setIsConversationTooLong(true);
    return;
  }

  // Check message count limit
if (messages.length >= 50) {
  setIsConversationTooLong(true);
  return;
}

  // Add user message
  const userMsg = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.trim(),
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMsg]);
  const currentInput = inputMessage.trim();
  setInputMessage('');
  setIsLoading(true);

  try {
    // Build conversation history for Claude API (last 10 messages only)
const recentMessages = messages
  .filter(msg => msg.id !== 1) // Skip initial greeting
  .slice(-10); // Take only last 10 messages

const conversationHistory = recentMessages.map(msg => ({
  role: msg.role === 'assistant' ? 'assistant' : 'user',
  content: msg.content
}));

// Add current user message
conversationHistory.push({
  role: 'user',
  content: currentInput
});

console.log(`📤 Sending ${conversationHistory.length} messages to Claude`);

    // Single Claude API call handles mode detection
    const result = await handleConversation(conversationHistory);

    switch(result.type) {
      case 'conversation':
        // Regular conversation response
        const botMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        
        // Update mode if in recommendations
        if (result.mode === 'recommendations') {
          setCurrentMode('recommendations');
        }
        break;
        
      case 'data-lookup':
        // NEW: Data lookup interruption
        setCurrentMode('data-lookup');
        
        // Show transition message
        const transitionMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message || "Let me look that up for you...",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, transitionMsg]);
        
        // Execute data lookup
        await executeDataLookup(result.vehicleQuery, result.vehicleName);
        
        // If interrupted search, offer to resume
        if (result.incompleteSearch) {
          const resumeMsg = {
            id: Date.now() + 2,
            role: 'assistant',
            content: "Would you like me to continue finding vehicles that match your original search?",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, resumeMsg]);
        }
        break;
        
      case 'search':
        // Complete recommendations search ready
        const searchMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, searchMsg]);
        
        // Execute search with criteria
        await executeSearch(result.criteria);
        
        // Clear mode
        setCurrentMode(null);
        break;
    }

  } catch (error) {
  console.error('Message handling error:', error);
  
  // Check if conversation too long
  if (error.message && error.message.includes("Conversation too long")) {
    setIsConversationTooLong(true);
    return;
  }
  
  const errorMsg = {
    id: Date.now() + 1,
    role: 'assistant',
    content: error.message || "Sorry, I'm having trouble connecting. Please try again in a moment.",
    timestamp: new Date()
  };
  
  setMessages(prev => [...prev, errorMsg]);
} finally {
  setIsLoading(false);
}
};

  /**
   * Toggle expanded view for a specific result set
   */
  const toggleExpandResults = (messageId) => {
    setExpandedResults(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-100 max-w-md mx-auto">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/CarExpert_Standard_Logo_RGB_Red_Black.png" 
              alt="CarExpert" 
              className="h-8 w-auto"
            />
            <div className="w-px h-6 bg-gray-300"></div>
            <span className="text-lg font-bold text-carexpert-black">AI Assistant</span>
          </div>
          <p className="text-sm text-gray-600">
            
          </p>
        </div>
      </div>

      {/* Scrollable chat messages */}
      <div className="flex-1 px-5 pt-28 pb-40 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'bg-carexpert-red text-white' 
                    : 'bg-gray-50 text-carexpert-black border border-gray-100'
                }`}>
                  <p className="text-sm leading-relaxed">
                    {formatMessage(message.content)}
                  </p>
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              {/* Display results after assistant messages with results */}
              {message.role === 'assistant' && message.results && (
                <div className="w-full mt-4 space-y-3">
                  {/* Determine how many results to show */}
                  {(() => {
                    const isExpanded = expandedResults[message.id];
                    const totalResults = message.results.length;
                    const displayCount = isExpanded ? totalResults : Math.min(5, totalResults);
                    const remainingCount = totalResults - 5;

                    return (
                      <>
                        {/* Display result cards */}
                        {message.results.slice(0, displayCount).map((vehicle, index) => (
                          <ChatResultCard 
                            key={vehicle.vehicleId} 
                            vehicle={vehicle} 
                            rank={index + 1} 
                          />
                        ))}

                        {/* Show More button - only if more than 5 results and not expanded */}
                        {totalResults > 5 && !isExpanded && (
                          <button
                            onClick={() => toggleExpandResults(message.id)}
                            className="w-full py-3 px-4 bg-carexpert-red text-white hover:bg-red-700 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center gap-2"
                          >
                            <span>Show {remainingCount} more recommendation{remainingCount === 1 ? '' : 's'}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}

                        {/* Show Less button - only if expanded */}
                        {isExpanded && totalResults > 5 && (
                          <button
                            onClick={() => toggleExpandResults(message.id)}
                            className="w-full py-3 px-4 bg-white border-2 border-gray-300 hover:border-carexpert-red text-gray-700 hover:text-carexpert-red rounded-xl font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2"
                          >
                            <span>Show less</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-carexpert-red rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-carexpert-red rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-carexpert-red rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed input area */}
<div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-md mx-auto">
  {/* Warning at 45 messages */}
  {messages.length >= 45 && messages.length < 50 && !isConversationTooLong && (
    <div className="mb-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      ⚠️ Approaching message limit ({messages.length}/50). Consider starting a new conversation soon.
    </div>
  )}
  
  {/* Blocked at 50 messages */}
  {isConversationTooLong && (
    <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-800 mb-2">
        💬 You've reached the maximum conversation length (50 messages).
      </p>
      <button
        onClick={() => window.location.reload()}
        className="w-full px-4 py-2 bg-carexpert-red text-white rounded-lg font-medium hover:bg-red-700"
      >
        Start New Conversation
      </button>
    </div>
  )}
  
  <div className="flex gap-3">
  <div className="flex-1">
    <input
      type="text"
      value={inputMessage}
      onChange={(e) => setInputMessage(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
      placeholder="Tell me what car you're looking for..."
      maxLength={500}
      className="w-full px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-carexpert-red focus:border-transparent text-sm"
      disabled={isLoading || isConversationTooLong}
    />
    {/* Character counter */}
    {inputMessage.length > 400 && (
      <div className={`text-xs mt-1 text-right ${inputMessage.length >= 500 ? 'text-red-600' : 'text-gray-500'}`}>
        {inputMessage.length}/500
      </div>
    )}
  </div>
    <button
      onClick={handleSendMessage}
      disabled={!inputMessage.trim() || isLoading || isConversationTooLong || inputMessage.length > 500}
      className={`px-6 py-3 rounded-full font-medium transition-all duration-200 text-sm ${
        !inputMessage.trim() || isLoading || isConversationTooLong || inputMessage.length > 500
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-carexpert-red text-white hover:bg-red-700 hover:shadow-lg'
      }`}
    >
      Send
    </button>
  </div>
</div>
          

      <BottomNav />
    </div>
  )
}

export default ChatPage