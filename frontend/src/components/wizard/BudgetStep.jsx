import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../common/BottomNav'
import { useWizard } from '../../context/WizardContext'


const BudgetStep = () => {
  const navigate = useNavigate()
  const { selections, updateSelections } = useWizard()
  const [selectedBudget, setSelectedBudget] = useState(selections.budget?.selection || '')
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [customMax, setCustomMax] = useState('')
  const [budgetMode, setBudgetMode] = useState('rrp') // 'rrp' or 'weekly'
  const [originalCustomMin, setOriginalCustomMin] = useState('')
  const [originalCustomMax, setOriginalCustomMax] = useState('')
  

  const rrpOptions = [
    { id: 'under-30k', amount: 'Under $30K', description: 'Great value options' },
    { id: '30k-50k', amount: '$30K - $50K', description: 'Most popular range' },
    { id: '50k-70k', amount: '$50K - $70K', description: 'Premium features' },
    { id: '70k-100k', amount: '$70K - $100K', description: 'Luxury territory' },
    { id: '100k-plus', amount: '$100K+', description: 'High-end luxury' }
  ]

  const weeklyOptions = [
    { id: 'under-100', amount: 'Under $100/week', description: 'Budget friendly' },
    { id: '100-150', amount: '$100-150/week', description: 'Most popular range' },
    { id: '150-200', amount: '$150-200/week', description: 'Mid-range comfort' },
    { id: '200-300', amount: '$200-300/week', description: 'Premium features' },
    { id: '300-plus', amount: '$300+/week', description: 'Luxury territory' }
  ]

  const currentOptions = budgetMode === 'rrp' ? rrpOptions : weeklyOptions
  const stepLabels = ['Budget', 'Use', 'Body', 'Fuel', 'Features', 'Result']

  const selectBudget = (budgetId) => {
  if (budgetId === 'custom') {
    // Custom is mutually exclusive
    setSelectedBudget('custom')
    return
  }
  
  // If custom is selected, clear it when selecting preset
  if (selectedBudget === 'custom') {
    setSelectedBudget(budgetId)
    return
  }
  
  // Handle multi-select for adjacent ranges
  const currentSelections = selectedBudget ? selectedBudget.split(',') : []
  const order = budgetMode === 'rrp' ? 
    ['under-30k', '30k-50k', '50k-70k', '70k-100k', '100k-plus'] :
    ['under-100', '100-150', '150-200', '200-300', '300-plus']
  
  if (currentSelections.includes(budgetId)) {
    // Smart cascade: remove this selection and everything after it
    const removeIndex = order.indexOf(budgetId)
    const newSelections = currentSelections.filter(id => {
      const idIndex = order.indexOf(id)
      return idIndex < removeIndex
    })
    setSelectedBudget(newSelections.join(','))
  } else {
    // Add if adjacent to existing selections
    const newSelections = [...currentSelections, budgetId]
    if (areAdjacent(newSelections)) {
      setSelectedBudget(newSelections.join(','))
    }
  }
}

const areAdjacent = (selections) => {
  if (selections.length <= 1) return true
  
  const order = ['under-30k', '30k-50k', '50k-70k', '70k-100k', '100k-plus']
  const weeklyOrder = ['under-100', '100-150', '150-200', '200-300', '300-plus']
  const currentOrder = budgetMode === 'rrp' ? order : weeklyOrder
  
  const indices = selections.map(id => currentOrder.indexOf(id)).sort((a, b) => a - b)
  
  // Check if indices are consecutive
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i-1] + 1) return false
  }
  
  return true
}

  const openCustomDialog = () => {
  // Store original values for cancel functionality
  setOriginalCustomMin(customMin)
  setOriginalCustomMax(customMax)
  setShowCustomDialog(true)
}

  const handleCustomSubmit = () => {
    if (customMin || customMax) {
      setSelectedBudget('custom')
      setShowCustomDialog(false)
    }
  }

  const getCustomRangeText = () => {
    if (budgetMode === 'weekly') {
      if (customMin && customMax) {
        return `$${customMin} - $${customMax}/week`
      } else if (customMin) {
        return `$${customMin}+/week`
      } else if (customMax) {
        return `Under $${customMax}/week`
      }
      return 'Custom Range'
    } else {
      if (customMin && customMax) {
        return `$${customMin} - $${customMax}`
      } else if (customMin) {
        return `$${customMin}+`
      } else if (customMax) {
        return `Under $${customMax}`
      }
      return 'Custom Range'
    }
  }

  const hasCustomRange = customMin || customMax
  const isCustomSelected = selectedBudget === 'custom'

  const handleNext = () => {
  let budgetData = {
    type: budgetMode,
    selection: selectedBudget,
    customMin: customMin,
    customMax: customMax
  }
  
  // Convert weekly selections to RRP ranges for filtering
  if (budgetMode === 'weekly' && selectedBudget && selectedBudget !== 'custom') {
    const selections = selectedBudget.split(',')
    const rrpRanges = selections.map(sel => getWeeklyToRRPRange(sel)).filter(Boolean)
    
    if (rrpRanges.length > 0) {
      budgetData.rrpMin = Math.min(...rrpRanges.map(r => r.min))
      budgetData.rrpMax = Math.max(...rrpRanges.map(r => r.max))
    }
  }
  
  updateSelections('budget', budgetData)
  console.log('Budget saved:', budgetData)
  navigate('/find/use-cases')
}

  const getInfoNote = () => {
    if (budgetMode === 'rrp') {
      return 'Prices show manufacturer\'s recommended retail price (RRP)'
    } else {
      return 'Calculated with 10% deposit, 5 years, 7% p.a. (indicative only)'
    }
  }

  const handleCustomReset = () => {
  setCustomMin('')
  setCustomMax('')
  setSelectedBudget('')
  setShowCustomDialog(false)
}

const getWeeklyToRRPRange = (weeklySelection) => {
  // Formula: Weekly payment = (RRP * 0.9 * (r * (1+r)^n)) / ((1+r)^n - 1) / 52
  // Where: r = 0.07/12 (monthly rate), n = 60 months
  // Reverse calculation: RRP ≈ Weekly * 52 * 4.85 / 0.9
  
  const weeklyToRRP = (weekly) => (weekly * 52 * 4.85) / 0.9
  
  switch(weeklySelection) {
    case 'under-100':
      return { min: 0, max: weeklyToRRP(100) } // ~$28K
    case '100-150':
      return { min: weeklyToRRP(100), max: weeklyToRRP(150) } // ~$28K-$42K
    case '150-200':
      return { min: weeklyToRRP(150), max: weeklyToRRP(200) } // ~$42K-$56K
    case '200-300':
      return { min: weeklyToRRP(200), max: weeklyToRRP(300) } // ~$56K-$84K
    case '300-plus':
      return { min: weeklyToRRP(300), max: Infinity } // ~$84K+
    default:
      return null
  }
}

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress dots with labels */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex justify-center items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
            <div className="w-6 h-px bg-gray-200"></div>
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
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
              <span className={index === 0 ? 'text-carexpert-red font-medium' : ''}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-3 pb-24">
        <h2 className="text-xl font-bold text-carexpert-black mb-2">
          What's your budget?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This helps us show you cars within your price range
        </p>

        {/* Toggle */}
        <div className="flex justify-center mb-2">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
  onClick={() => {
    setBudgetMode('rrp')
    // Clear all selections when switching modes
    setSelectedBudget('')
    setCustomMin('')
    setCustomMax('')
  }}
  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
    budgetMode === 'rrp'
      ? 'bg-white text-carexpert-black shadow-sm'
      : 'text-gray-600'
  }`}
>
  Price
</button>
<button
  onClick={() => {
    setBudgetMode('weekly')
    // Clear all selections when switching modes
    setSelectedBudget('')
    setCustomMin('')
    setCustomMax('')
  }}
  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
    budgetMode === 'weekly'
      ? 'bg-white text-carexpert-black shadow-sm'
      : 'text-gray-600'
  }`}
>
  Weekly Repayments
</button>
          </div>
        </div>

        {/* Info note */}
        <p className="text-xs text-gray-400 text-center mb-6">
          {getInfoNote()}
        </p>

        {/* Budget options grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
  {currentOptions.map((budget) => {
    const currentSelections = selectedBudget ? selectedBudget.split(',') : []
    const isSelected = currentSelections.includes(budget.id)
    const hasMultipleSelections = currentSelections.length > 1
    
    return (
      <button
        key={budget.id}
        onClick={() => selectBudget(budget.id)}
        className={`p-3 rounded-xl border-2 text-center min-h-[80px] flex flex-col justify-center transition-all relative ${
          isSelected
            ? 'border-carexpert-red bg-red-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-carexpert-red text-white rounded-full flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        )}
        <div className="text-sm font-semibold text-carexpert-black mb-1">
          {budget.amount}
        </div>
        <div className="text-xs text-gray-600">
          {budget.description}
        </div>
      </button>
    )
  })}

          {/* Custom range option */}
          <button
    onClick={openCustomDialog}
    disabled={selectedBudget && selectedBudget !== 'custom'}
    className={`p-3 rounded-xl border-2 text-center min-h-[80px] flex flex-col justify-center transition-all relative ${
      selectedBudget === 'custom'
        ? 'border-carexpert-red bg-red-50'
        : selectedBudget && selectedBudget !== 'custom'
        ? 'border-gray-200 bg-gray-50 opacity-50'
        : 'border-gray-200 bg-white'
    }`}
  >
            {isCustomSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-carexpert-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                ✓
              </div>
            )}
            <div className="text-sm font-semibold text-carexpert-black mb-1">
              {isCustomSelected ? getCustomRangeText() : 'Custom Range'}
            </div>
            <div className="text-xs text-gray-600">
              {isCustomSelected ? 'Your range' : budgetMode === 'weekly' ? 'Set min/max weekly' : 'Set min/max budget'}
            </div>
          </button>
        </div>
      </div>

      {/* Custom range dialog */}
      {showCustomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm relative">
                          <button
                onClick={handleCustomReset}
                className="absolute top-4 right-4 text-sm text-carexpert-red hover:text-red-700 font-medium"
              >
                Reset
              </button>
            <h3 className="text-lg font-semibold text-carexpert-black mb-4">
              {budgetMode === 'weekly' ? 'Set your weekly range' : 'Set your budget range'}
            </h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Minimum (optional) {budgetMode === 'weekly' && '- per week'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={budgetMode === 'weekly' ? 'e.g. 150' : 'e.g. 30000'}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-carexpert-red"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Maximum (optional) {budgetMode === 'weekly' && '- per week'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={budgetMode === 'weekly' ? 'e.g. 250' : 'e.g. 50000'}
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-carexpert-red"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
  // Restore original values
  setCustomMin(originalCustomMin)
  setCustomMax(originalCustomMax)
  setShowCustomDialog(false)
}}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomSubmit}
                className="flex-1 py-3 bg-carexpert-red text-white rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

     {/* Next button */}
<div className="fixed bottom-20 left-0 right-0 bg-white pt-4 pb-6">
  <div className="px-5">
    <button
  onClick={handleNext}
  className="w-full text-base font-semibold py-2 rounded-lg bg-carexpert-red text-white hover:bg-red-700 transition-colors duration-200"
>
  {!selectedBudget ? 'Skip' : 'Next'}
</button>
  </div>
</div>

      <BottomNav />
    </div>
  )
}

export default BudgetStep