import { createContext, useContext, useState } from 'react'
import vehiclesPart1 from '../data/vehicles-part1.json'
import vehiclesPart2 from '../data/vehicles-part2.json'

const WizardContext = createContext()

export const useWizard = () => {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider')
  }
  return context
}

export const WizardProvider = ({ children }) => {
  const [selections, setSelections] = useState({
    budget: null,
    useCases: [],
    bodyTypes: [],
    fuelTypes: [],
    features: []
  })

const vehicleData = [...vehiclesPart1, ...vehiclesPart2]



  const updateSelections = (step, data) => {
    setSelections(prev => ({
      ...prev,
      [step]: data
    }))
  }

  // Mapping functions (copied from ResultsStep)
  const mapUseCasesToDatabase = (selections) => {
    const { selected, familyOptions, towingOptions, offRoadOptions } = selections.useCases || {}
    const dbUseCases = []
    
    if (!selected) return dbUseCases
    
    selected.forEach(useCase => {
      switch(useCase) {
        case 'family-life':
          if (familyOptions?.includes('5 seats')) dbUseCases.push('FAMILY_LIFE_5SEAT')
          if (familyOptions?.includes('6+ seats')) dbUseCases.push('FAMILY_LIFE_6PLUS')
          break
        case 'city-driving':
          dbUseCases.push('CITY_DRIVING')
          break
        case 'long-trips':
          dbUseCases.push('LONG_TRIPS')
          break
        case 'fuel-efficient':
          dbUseCases.push('FUEL_EFFICIENT')
          break
        case 'carrying-gear':
          dbUseCases.push('CARRYING_GEAR')
          break
        case 'workhorse':
          dbUseCases.push('WORKHORSE')
          break
        case 'towing':
          if (towingOptions?.includes('Light')) dbUseCases.push('TOWING_LIGHT')
          if (towingOptions?.includes('Heavy')) dbUseCases.push('TOWING_HEAVY')
          break
        case 'off-road':
          if (offRoadOptions?.includes('Light')) dbUseCases.push('OFFROAD_LIGHT')
          if (offRoadOptions?.includes('Heavy')) dbUseCases.push('OFFROAD_HEAVY')
          break
        case 'luxury':
          dbUseCases.push('LUXURY')
          break
        case 'enthusiast':
          dbUseCases.push('FUN_PERFORMANCE')
          break
      }
    })
    
    return dbUseCases
  }

  const mapFeaturesToDatabase = (features) => {
    const featureMap = {
      'carplay': 'has_carplay',
      'android-auto': 'has_android_auto',
      'adaptive-cruise': 'has_adaptive_cruise',
      '360-camera': 'has_360_camera',
      'wireless-charging': 'has_wireless_charging',
      'heated-seats': 'has_heated_seats',
      'sunroof': 'has_sunroof',
      'powered-tailgate': 'has_powered_tailgate',
      'awd': 'has_awd',
      'spare-wheel': 'has_spare_wheel'
    }
    
    return features?.map(feature => featureMap[feature]).filter(Boolean) || []
  }

  const getResultCount = (tempSelections = {}) => {
  if (vehicleData.length === 0) return 0

    // Merge current selections with any temporary selections being tested
    const testSelections = { ...selections, ...tempSelections }
    
    // Filter vehicles based on selections (same logic as ResultsStep)
  return vehicleData.filter(car => {
    // FIRST: Filter out cars with invalid pricing
    const price = parseFloat(car.retail_price)
    if (!price || price <= 0 || car.retail_price === "0" || car.retail_price === "unknown" || !car.retail_price) {
      return false
    }
    
    // Budget filter
      if (testSelections.budget?.selection) {
        const price = parseFloat(car.retail_price) || 0
        const { type, selection } = testSelections.budget
        
        if (type === 'weekly') {
          // Use converted RRP ranges for weekly selections
          if (testSelections.budget.rrpMin !== undefined && price < testSelections.budget.rrpMin) return false
          if (testSelections.budget.rrpMax !== undefined && testSelections.budget.rrpMax !== Infinity && price > testSelections.budget.rrpMax) return false
        } else {
          // RRP mode - handle both single and multiple selections
          if (selection === 'custom') {
            const { customMin, customMax } = testSelections.budget
            if (customMin && price < parseFloat(customMin)) return false
            if (customMax && price > parseFloat(customMax)) return false
          } else {
            // Handle comma-separated adjacent ranges
            const selectedRanges = selection.split(',')
            
            // Define range bounds
            const rangeBounds = {
              'under-30k': { min: 0, max: 30000 },
              '30k-50k': { min: 30000, max: 50000 },
              '50k-70k': { min: 50000, max: 70000 },
              '70k-100k': { min: 70000, max: 100000 },
              '100k-plus': { min: 100000, max: Infinity }
            }
            
            // Get overall min/max from selected ranges
            const mins = selectedRanges.map(range => rangeBounds[range]?.min || 0)
            const maxs = selectedRanges.map(range => rangeBounds[range]?.max || Infinity)
            
            const minPrice = Math.min(...mins)
            const maxPrice = Math.max(...maxs)
            
            if (price < minPrice || price > maxPrice) return false
          }
        }
      }
      
      // Use cases filter
      const requiredUseCases = mapUseCasesToDatabase(testSelections)
      if (requiredUseCases.length > 0) {
        const carUseCases = car.carexpert_use_cases || []
        
        // Separate categories that need OR logic
        const familyUseCases = requiredUseCases.filter(uc => uc.includes('FAMILY_LIFE'))
        const towingUseCases = requiredUseCases.filter(uc => uc.includes('TOWING'))
        const offRoadUseCases = requiredUseCases.filter(uc => uc.includes('OFFROAD'))
        const otherUseCases = requiredUseCases.filter(uc => 
          !uc.includes('FAMILY_LIFE') && !uc.includes('TOWING') && !uc.includes('OFFROAD'))
        
        // Check family use cases with OR logic
        if (familyUseCases.length > 1) {
          const hasFamilyMatch = familyUseCases.some(useCase => carUseCases.includes(useCase))
          if (!hasFamilyMatch) return false
        } else if (familyUseCases.length === 1) {
          if (!carUseCases.includes(familyUseCases[0])) return false
        }
        
        // Check towing use cases with OR logic
        if (towingUseCases.length > 1) {
          const hasTowingMatch = towingUseCases.some(useCase => carUseCases.includes(useCase))
          if (!hasTowingMatch) return false
        } else if (towingUseCases.length === 1) {
          if (!carUseCases.includes(towingUseCases[0])) return false
        }
        
        // Check off-road use cases with OR logic
        if (offRoadUseCases.length > 1) {
          const hasOffRoadMatch = offRoadUseCases.some(useCase => carUseCases.includes(useCase))
          if (!hasOffRoadMatch) return false
        } else if (offRoadUseCases.length === 1) {
          if (!carUseCases.includes(offRoadUseCases[0])) return false
        }
        
        // Check other use cases with AND logic
        const hasOtherUseCases = otherUseCases.every(useCase => carUseCases.includes(useCase))
        if (!hasOtherUseCases) return false
      }
      
      // Body type filter
      if (testSelections.bodyTypes?.length > 0) {
        if (!testSelections.bodyTypes.includes(car.carexpert_body_type)) return false
      }
      
      // Fuel type filter  
      if (testSelections.fuelTypes?.length > 0) {
        if (!testSelections.fuelTypes.includes(car.carexpert_fuel_type)) return false
      }
      
      // Features filter
      const requiredFeatures = mapFeaturesToDatabase(testSelections.features)
      if (requiredFeatures.length > 0) {
        const carFeatures = car.carexpert_features || {}
        const hasAllFeatures = requiredFeatures.every(feature => carFeatures[feature] === true)
        if (!hasAllFeatures) return false
      }
      
      return true
    }).length
  }

  return (
  <WizardContext.Provider value={{ 
    selections, 
    updateSelections, 
    getResultCount
  }}>
    {children}
  </WizardContext.Provider>
)
}