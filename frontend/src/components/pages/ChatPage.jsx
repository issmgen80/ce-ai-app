import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'
import { handleConversation } from '../../utils/conversationHandler'
import { convertToJatoLabels, validateJatoFilters } from '../../utils/jatoConverter'
import { scanJatoDatabase, validateScanFilters, getNoMatchesMessage } from '../../utils/jatoScanner'
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
  // const [searchResults, setSearchResults] = useState(null)
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
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Execute vehicle search with JATO pre-filtering + vector search
   */
  const executeSearch = async (criteria) => {
    console.log("🔍 EXECUTING SEARCH WITH CRITERIA:", criteria);
    
    try {
      // Step 1: Convert to JATO labels
      const jatoFilters = await convertToJatoLabels({
        budget: criteria.budget,
        useCase: criteria.useCase,
        bodyType: criteria.bodyType,
        fuelType: criteria.fuelType,
        vectorRequirements: criteria.vectorRequirements || []
      });

      // Step 2: Validate filters
      if (!validateJatoFilters(jatoFilters)) {
        throw new Error("Invalid JATO filter conversion");
      }

      const scanValidation = validateScanFilters(jatoFilters);
      if (!scanValidation.isValid) {
        throw new Error(`Filter validation failed: ${scanValidation.errors.join(', ')}`);
      }

      // Step 3: Scan JATO database (pre-filtering)
      console.log("📊 Scanning JATO database...");
      const scanResults = scanJatoDatabase(jatoFilters);
      console.log(`Found ${scanResults.matchCount} vehicles after pre-filtering`);

      // Step 4: Check for no matches
      if (scanResults.matchCount === 0) {
        const noMatchMessage = getNoMatchesMessage(jatoFilters);
        const errorMsg = {
          id: Date.now(),
          role: 'assistant',
          content: noMatchMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      // Step 5: Show searching message
      const searchingMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `Found matching vehicles! Analyzing them now...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, searchingMsg]);

      /* SHOW SEARCHING MESSAGE WITH COUNT
      const searchingMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `Found ${scanResults.matchCount} matching vehicles. Analyzing them now...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, searchingMsg]);
      */

      // Step 6: Execute vector search via backend API
      console.log("🔍 Calling vector search API...");
      const vectorResponse = await fetch(`${API_URL}/api/vector-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorRequirements: jatoFilters.vectorRequirements,
          vehicleIds: scanResults.vehicleIds
        })
      });

      if (!vectorResponse.ok) {
        throw new Error(`API request failed: ${vectorResponse.status}`);
      }

      const vectorData = await vectorResponse.json();

      if (!vectorData.success) {
        throw new Error(vectorData.error || 'Vector search failed');
      }

      console.log("✅ Vector search complete:", vectorData.results.length, "results");

      // Step 7: Display results - store IN the message
const resultsMsg = {
  id: Date.now() + 1,
  role: 'assistant',
  content: `Here are your top recommendations, ranked by popularity in Australia:`,
  timestamp: new Date(),
  results: vectorData.results  // Store results here
};

      setMessages(prev => [...prev, resultsMsg]);

    } catch (error) {
      console.error("🚨 Search error:", error);
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
   * Handle user message - SIMPLIFIED SINGLE CALL
   */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
      // Build conversation history for Claude API
      const conversationHistory = messages
  .filter(msg => msg.id !== 1) // Skip initial greeting
  .map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
      
      // Add current user message
      conversationHistory.push({
        role: 'user',
        content: currentInput
      });

      // SINGLE Claude API call handles everything
      const result = await handleConversation(conversationHistory);

      if (result.type === 'search') {
        // Search ready - show transition message and execute search
        const transitionMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, transitionMsg]);
        
        // Execute search with criteria
        await executeSearch(result.criteria);
        
      } else {
        // Continue conversation
        const botMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      }

    } catch (error) {
      console.error('Message handling error:', error);
      
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
    {message.results.slice(0, 5).map((vehicle, index) => (
      <ChatResultCard 
        key={vehicle.vehicleId} 
        vehicle={vehicle} 
        rank={index + 1} 
      />
    ))}
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
        <div className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Tell me what car you're looking for..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-carexpert-red focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-200 text-sm ${
              !inputMessage.trim() || isLoading
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