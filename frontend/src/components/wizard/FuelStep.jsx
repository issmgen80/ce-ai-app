import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fuel, Zap, Plug, Battery, Leaf } from 'lucide-react'
import BottomNav from '../common/BottomNav'
import { useWizard } from '../../context/WizardContext'

const FuelStep = () => {
  const navigate = useNavigate()
  const { selections, updateSelections, getResultCount } = useWizard()
  const [selectedFuelTypes, setSelectedFuelTypes] = useState([])

  const stepLabels = ['Budget', 'Use', 'Body', 'Fuel', 'Features', 'Result']
  const MAX_SELECTIONS = 3

  const fuelTypeOptions = [
    { id: 'petrol', label: 'Petrol', icon: Fuel },
    { id: 'diesel', label: 'Diesel', icon: Fuel },
    { id: 'hybrid', label: 'Hybrid', icon: Leaf },
    { id: 'plug_in_hybrid', label: 'Plug-in Hybrid', icon: Plug },
    { id: 'electric', label: 'Electric', icon: Zap }
  ]

  const handleFuelTypeClick = (fuelTypeId) => {
    if (selectedFuelTypes.includes(fuelTypeId)) {
      setSelectedFuelTypes(selectedFuelTypes.filter(id => id !== fuelTypeId))
    } else if (selectedFuelTypes.length < MAX_SELECTIONS) {
      setSelectedFuelTypes([...selectedFuelTypes, fuelTypeId])
    }
  }

  const isSelected = (fuelTypeId) => selectedFuelTypes.includes(fuelTypeId)
  const isDisabled = (fuelTypeId) => !isSelected(fuelTypeId) && selectedFuelTypes.length >= MAX_SELECTIONS

  const handleNext = () => {
  updateSelections('fuelTypes', selectedFuelTypes)
  console.log('Fuel types saved:', selectedFuelTypes)
  navigate('/find/features')
}

const currentCount = getResultCount({ 
  budget: selections.budget,
  useCases: selections.useCases,
  bodyTypes: selections.bodyTypes,
  fuelTypes: selectedFuelTypes
})

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-20">
        {/* Progress dots with labels */}
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
              <div className="w-6 h-px bg-gray-200"></div>
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
              <div className="w-6 h-px bg-gray-200"></div>
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 px-3">
            {stepLabels.map((label, index) => (
              <div key={label} className="flex-1 text-center">
                <span className={index <= 3 ? 'text-carexpert-red font-medium' : ''}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Fixed heading */}
        <div className="px-5 py-3">
          <h2 className="text-xl font-bold text-carexpert-black mb-2">
            What fuel type do you prefer?
          </h2>
          <p className="text-sm text-gray-600">
            Select up to 3 fuel types that suit your needs
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pt-40 pb-48">
        {/* Fuel type options grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {fuelTypeOptions.map((fuelType) => {
            const selected = isSelected(fuelType.id)
            const disabled = isDisabled(fuelType.id)
            const IconComponent = fuelType.icon
            
            return (
              <button
                key={fuelType.id}
                onClick={() => handleFuelTypeClick(fuelType.id)}
                disabled={disabled}
                className={`p-4 rounded-xl border-2 text-center min-h-[70px] flex flex-col items-center justify-center transition-all relative ${
                  selected
                    ? 'border-carexpert-red bg-red-50'
                    : disabled
                    ? 'border-gray-200 bg-gray-50 opacity-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-carexpert-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
                <IconComponent size={24} className="text-gray-400 mb-2" />
                <div className="text-sm font-semibold text-carexpert-black">
                  {fuelType.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scroll fade indicator */}
      <div className="fixed bottom-[160px] left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10"></div>

      {/* Back and Next buttons */}
      <div className="fixed bottom-20 left-0 right-0 bg-white pt-4 pb-6 border-t border-gray-100">
        <div className="px-5 flex gap-3">
          <button
  onClick={() => navigate('/find/body')} // or previous step
  className="w-1/3 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
>
  Back
</button>
          <button
  onClick={handleNext}
  disabled={currentCount <= 1}
  className={`w-2/3 text-base font-semibold py-2 rounded-lg transition-colors duration-200 ${
    currentCount <= 1
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-carexpert-red text-white hover:bg-red-700'
  }`}
>
  {selectedFuelTypes.length === 0 ? `Skip (${currentCount})` : currentCount <= 1 ? `Next (0)` : `Next (${currentCount})`}
</button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default FuelStep