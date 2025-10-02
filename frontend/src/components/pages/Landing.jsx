import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'


const Landing = () => {
  const navigate = useNavigate()

  const previewSteps = [
    'Your budget',
    'How you\'ll use the car',
    'Body style preference', 
    'Fuel type',
    'Must-have features'
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      

      {/* Header */}
      <div className="px-5 py-3 pt-6 border-b border-carexpert-off-white">
        <img 
          src="/CarExpert_Standard_Logo_RGB_Red_Black.png" 
          alt="CarExpert" 
          className="h-10 w-auto"
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-10 text-center">
        <h1 className="text-3xl font-bold text-carexpert-black mb-3">
          Find Your Perfect Car
        </h1>
        <p className="text-gray-600 mb-10 leading-relaxed">
          Australia's first AI assisted car finder
        </p>

        {/* Preview Steps */}
        <div className="bg-carexpert-off-white rounded-2xl p-6 mb-10 text-left">
          <h3 className="text-lg font-semibold mb-4 text-carexpert-black">
            We'll ask you about:
          </h3>
          <ul className="space-y-2">
            {previewSteps.map((step, index) => (
              <li key={index} className="flex items-center text-gray-600 text-sm">
                <span className="w-6 h-6 bg-carexpert-red text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/find/budget')}
          className="w-full bg-carexpert-red text-white text-lg font-semibold py-4 rounded-xl hover:bg-red-700 transition-colors duration-200"
        >
          Get Started
        </button>
      </div>
 <BottomNav />
      
    </div>
  )
}

export default Landing