import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'
import { Users, Building2, MapPin, Leaf, Package, Wrench, Truck, Mountain, Crown, Zap } from 'lucide-react'
import { useWizard } from '../../context/WizardContext'


const UseCasesStep = () => {
  const navigate = useNavigate()
  const { selections, updateSelections, getResultCount } = useWizard()
  const [selectedUseCases, setSelectedUseCases] = useState([])
  const [showFamilyDialog, setShowFamilyDialog] = useState(false)
  const [showTowingDialog, setShowTowingDialog] = useState(false)
  const [showOffRoadDialog, setShowOffRoadDialog] = useState(false)
  const [familyOptions, setFamilyOptions] = useState([])
  const [towingOptions, setTowingOptions] = useState([])
  const [offRoadOptions, setOffRoadOptions] = useState([])

  const stepLabels = ['Budget', 'Use', 'Body', 'Fuel', 'Features', 'Result']
  const MAX_SELECTIONS = 3

const useCaseOptions = [
  { id: 'family-life', label: 'Family', hasDialog: true, icon: Users },
  { id: 'city-driving', label: 'City', hasDialog: false, icon: Building2 },
  { id: 'long-trips', label: 'Trips', hasDialog: false, icon: MapPin },
  { id: 'fuel-efficient', label: 'Eco', hasDialog: false, icon: Leaf },
  { id: 'carrying-gear', label: 'Gear', hasDialog: false, icon: Package },
  { id: 'workhorse', label: 'Workhorse', hasDialog: false, icon: Wrench },
  { id: 'towing', label: 'Towing', hasDialog: true, icon: Truck },
  { id: 'off-road', label: 'Off-road', hasDialog: true, icon: Mountain },
  { id: 'luxury', label: 'Luxury', hasDialog: false, icon: Crown },
  { id: 'enthusiast', label: 'Enthusiast', hasDialog: false, icon: Zap }
]

  const handleUseCaseClick = (useCaseId) => {
    const useCase = useCaseOptions.find(uc => uc.id === useCaseId)
    
    if (useCase.hasDialog) {
      // Open dialog for expandable categories
      if (useCaseId === 'family-life') setShowFamilyDialog(true)
      else if (useCaseId === 'towing') setShowTowingDialog(true)
      else if (useCaseId === 'off-road') setShowOffRoadDialog(true)
    } else {
      // Toggle selection for simple categories
      if (selectedUseCases.includes(useCaseId)) {
        setSelectedUseCases(selectedUseCases.filter(id => id !== useCaseId))
      } else if (selectedUseCases.length < MAX_SELECTIONS) {
        setSelectedUseCases([...selectedUseCases, useCaseId])
      }
    }
  }

  const handleDialogSubmit = (categoryId, selectedOptions) => {
    if (selectedOptions.length > 0) {
      // Store the sub-options
      if (categoryId === 'family-life') setFamilyOptions(selectedOptions)
      else if (categoryId === 'towing') setTowingOptions(selectedOptions)
      else if (categoryId === 'off-road') setOffRoadOptions(selectedOptions)

      // Add to selected use cases if not already there
      if (!selectedUseCases.includes(categoryId)) {
        if (selectedUseCases.length < MAX_SELECTIONS) {
          setSelectedUseCases([...selectedUseCases, categoryId])
        }
      }
    } else {
      // Remove from selected if no sub-options chosen
      setSelectedUseCases(selectedUseCases.filter(id => id !== categoryId))
      if (categoryId === 'family-life') setFamilyOptions([])
      else if (categoryId === 'towing') setTowingOptions([])
      else if (categoryId === 'off-road') setOffRoadOptions([])
    }
    
    // Close dialogs
    setShowFamilyDialog(false)
    setShowTowingDialog(false)
    setShowOffRoadDialog(false)
  }

  const getButtonDisplayText = (useCaseId) => {
    const baseLabel = useCaseOptions.find(uc => uc.id === useCaseId)?.label
    
    if (useCaseId === 'family-life' && familyOptions.length > 0) {
      return `${baseLabel}: ${familyOptions.join(', ')}`
    } else if (useCaseId === 'towing' && towingOptions.length > 0) {
      return `${baseLabel}: ${towingOptions.join(', ')}`
    } else if (useCaseId === 'off-road' && offRoadOptions.length > 0) {
      return `${baseLabel}: ${offRoadOptions.join(', ')}`
    }
    
    return baseLabel
  }

  const isSelected = (useCaseId) => selectedUseCases.includes(useCaseId)
  const isDisabled = (useCaseId) => !isSelected(useCaseId) && selectedUseCases.length >= MAX_SELECTIONS

  const handleNext = () => {
  const useCasesData = {
    selected: selectedUseCases,
    familyOptions: familyOptions,
    towingOptions: towingOptions,
    offRoadOptions: offRoadOptions
  }
  updateSelections('useCases', useCasesData)
  console.log('Use cases saved:', useCasesData)
  navigate('/find/body')
}

  const DialogComponent = ({ show, title, options, selectedOptions, onSubmit, onCancel }) => {
    const [tempSelected, setTempSelected] = useState(selectedOptions)

    if (!show) return null

    const toggleOption = (option) => {
      if (tempSelected.includes(option)) {
        setTempSelected(tempSelected.filter(opt => opt !== option))
      } else {
        setTempSelected([...tempSelected, option])
      }
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm">
          <h3 className="text-lg font-semibold text-carexpert-black mb-4">{title}</h3>
          <div className="space-y-3 mb-6">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => toggleOption(option.label)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all relative ${
                  tempSelected.includes(option.label)
                    ? 'border-carexpert-red bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {tempSelected.includes(option.label) && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-carexpert-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
                <div className="text-sm font-medium text-carexpert-black">{option.label}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(tempSelected)}
              className="flex-1 py-3 bg-carexpert-red text-white rounded-lg font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentCount = getResultCount({ 
  budget: selections.budget, // Include previous budget selection
  useCases: { selected: selectedUseCases, familyOptions, towingOptions, offRoadOptions }
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
            <div className="w-6 h-px bg-gray-200"></div>
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <div className="w-6 h-px bg-gray-200"></div>
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <div className="w-6 h-px bg-gray-200"></div>
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <div className="w-6 h-px bg-gray-200"></div>
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 px-3">
          {stepLabels.map((label, index) => (
            <div key={label} className="flex-1 text-center">
              <span className={index === 0 || index === 1 ? 'text-carexpert-red font-medium' : ''}>
                  {label}
              </span>
            </div>
          ))}
        </div>
      </div>

     {/* Fixed heading */}
    <div className="px-5 py-3">
      <h2 className="text-xl font-bold text-carexpert-black mb-2">
        What type of car are you looking for?
      </h2>
      <p className="text-sm text-gray-600">
        Select up to 3 use cases that match your lifestyle
      </p>
    </div>
  </div>
 {/* Scrollable content */}
  <div className="flex-1 px-5 pt-40 pb-48">
        {/* Use case options grid */}
<div className="grid grid-cols-2 gap-3 mb-6">
  {useCaseOptions.map((useCase) => {
    const selected = isSelected(useCase.id)
    const disabled = isDisabled(useCase.id)
    const IconComponent = useCase.icon
    
    return (
      <button
        key={useCase.id}
        onClick={() => handleUseCaseClick(useCase.id)}
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
          {getButtonDisplayText(useCase.id)}
        </div>
      </button>
    )
  })}
</div>

        
      </div>

      {/* Dialogs */}
      <DialogComponent
        show={showFamilyDialog}
        title="Family life options"
        options={[
          { id: '5-seats', label: '5 seats' },
          { id: '6-plus-seats', label: '6+ seats' }
        ]}
        selectedOptions={familyOptions}
        onSubmit={(selected) => handleDialogSubmit('family-life', selected)}
        onCancel={() => setShowFamilyDialog(false)}
      />

      <DialogComponent
        show={showTowingDialog}
        title="Towing options"
        options={[
          { id: 'light-towing', label: 'Light' },
          { id: 'heavy-towing', label: 'Heavy' }
        ]}
        selectedOptions={towingOptions}
        onSubmit={(selected) => handleDialogSubmit('towing', selected)}
        onCancel={() => setShowTowingDialog(false)}
      />

      <DialogComponent
        show={showOffRoadDialog}
        title="Off-road options"
        options={[
          { id: 'light-offroad', label: 'Light' },
          { id: 'heavy-offroad', label: 'Heavy' }
        ]}
        selectedOptions={offRoadOptions}
        onSubmit={(selected) => handleDialogSubmit('off-road', selected)}
        onCancel={() => setShowOffRoadDialog(false)}
      />

      {/* Scroll fade indicator */}
<div className="fixed bottom-[160px] left-0 right-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-10"></div>


      {/* Back and Next buttons */}
<div className="fixed bottom-20 left-0 right-0 bg-white pt-4 pb-6 border-t border-gray-100">
  <div className="px-5 flex gap-3">
    <button
      onClick={() => navigate('/find/budget')}
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
  {selectedUseCases.length === 0 ? `Skip (${currentCount})` : currentCount <= 1 ? `Next (0)` : `Next (${currentCount})`}
</button>
  </div>
</div>

      <BottomNav />
    </div>
  )
}

export default UseCasesStep