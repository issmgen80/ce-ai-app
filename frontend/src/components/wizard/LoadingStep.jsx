import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'

const LoadingStep = () => {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)
  
  const messages = [
    "Analyzing your preferences...",
    "Scanning 2,900 vehicles...", 
    "Matching features & specs...",
    "Ranking best options..."
  ]
  
  useEffect(() => {
    // Random duration between 3-5 seconds
    const totalDuration = Math.random() * 2000 + 3000
    const interval = 50 // Update every 50ms
    const increment = 100 / (totalDuration / interval)
    
    const progressTimer = setInterval(() => {
      setProgress(prev => {
  const newProgress = Math.min(prev + increment, 100)
  if (newProgress >= 100) {
    clearInterval(progressTimer)
    // Use setTimeout to avoid state update during unmount
    setTimeout(() => navigate('/find/results'), 100)
    return 100
  }
  return newProgress
})
    }, interval)
    
    // Cycle through messages
    const messageTimer = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 1500)
    
    return () => {
      clearInterval(progressTimer)
      clearInterval(messageTimer)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress dots */}
      <div className="fixed top-0 left-0 right-0 bg-white z-20">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex justify-center items-center mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 px-3">
            {['Budget', 'Use', 'Body', 'Fuel', 'Features', 'Result'].map((label) => (
              <div key={label} className="flex-1 text-center">
                <span className="text-carexpert-red font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main loading content */}
      <div className="flex-1 flex items-center justify-center px-5 pt-24 pb-32">
        <div className="text-center max-w-sm w-full">
          
          {/* Animated logo/icon */}
          <div className="relative mb-12">
            <div className="w-16 h-16 mx-auto relative">
              {/* Outer breathing ring */}
              <div className="absolute inset-0 rounded-full bg-carexpert-red opacity-20 animate-ping"></div>
              {/* Middle ring */}
              <div className="absolute inset-2 rounded-full bg-carexpert-red opacity-40 animate-pulse"></div>
              {/* Inner dot */}
              <div className="absolute inset-6 rounded-full bg-carexpert-red animate-pulse"></div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-carexpert-red to-red-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-2 font-medium">
              {Math.round(progress)}%
            </div>
          </div>

          {/* Dynamic message */}
          <div className="h-12 flex items-center justify-center">
            <p className="text-gray-600 text-base font-medium transition-opacity duration-300">
              {messages[currentMessage]}
            </p>
          </div>

          {/* Subtle stats */}
          <div className="mt-8 text-xs text-gray-400 space-y-1">
            <div>Powered by CarExpert AI</div>
            <div>2,900 vehicles • 71 brands</div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default LoadingStep