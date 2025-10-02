import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, ExternalLink, ChevronDown } from 'lucide-react'
import BottomNav from '../common/BottomNav'
import reviewsData from '../../data/carexpert_reviews_enhanced_matches.json'
import { useWizard } from '../../context/WizardContext'
import vehiclesPart1 from '../../data/vehicles-part1.json'
import vehiclesPart2 from '../../data/vehicles-part2.json'
const vehicleData = [...vehiclesPart1, ...vehiclesPart2]

const getSeatingDisplay = (car) => {
  try {
    const seatingInfo = car.standard_equipment?.Seating || ''
    
    // Word to number mapping
    const wordToNumber = {
      'two': '2',
      'three': '3', 
      'four': '4',
      'five': '5',
      'six': '6',
      'seven': '7',
      'eight': '8',
      'nine': '9'
    }
    
    // Extract number from text like "Five seats configured 2+3"
    for (const [word, number] of Object.entries(wordToNumber)) {
      if (seatingInfo.toLowerCase().includes(word)) {
        return `${number} seats`
      }
    }
    
    // Fallback: look for digit patterns like "2+3" or direct numbers
    const digitMatch = seatingInfo.match(/(\d+)\+(\d+)/)
    if (digitMatch) {
      const total = parseInt(digitMatch[1]) + parseInt(digitMatch[2])
      return `${total} seats`
    }
    
    // Look for direct number mentions
    const directMatch = seatingInfo.match(/(\d+)\s*seats?/i)
    if (directMatch) {
      return `${directMatch[1]} seats`
    }
    
    // Default fallback
    return '5 seats'
  } catch (error) {
    return '5 seats'
  }
}

const getDisplayBodyType = (bodyType) => {
  if (!bodyType) return 'Unknown'
  
  const typeMap = {
    'suv': 'SUV',
    'hatchback': 'Hatch',
  }
  
  const normalized = bodyType.toLowerCase()
  return typeMap[normalized] || bodyType.charAt(0).toUpperCase() + bodyType.slice(1).toLowerCase()
}

const getCleanMakeModel = (car) => {
  try {
    const localMake = car.specifications?.["schema_Local make name"] || car.make_display
    const localModel = car.specifications?.["schema_Local model name"] || car.model_display
    
    if (!localMake || !localModel) {
      return `${car.make_display} ${car.model_display}`
    }
    
    // Process model (remove make if contained)
    let cleanModel = localModel
    if (localModel && localMake && localModel.toLowerCase().includes(localMake.toLowerCase())) {
      cleanModel = localModel.replace(new RegExp(localMake, 'i'), '').trim()
    }
    
    return `${localMake} ${cleanModel}`.trim()
  } catch (error) {
    return `${car.make_display} ${car.model_display}`
  }
}

const getCleanVersion = (car) => {
  try {
    const localVersion = car.specifications?.["schema_Local version name"] || ""
    
    if (!localVersion || typeof localVersion !== 'string') return ""
    
    let versionWords = localVersion.split(' ').filter(word => word && word.length > 0)
    
    // Remove leading number like "2.0", "2.5"
    if (versionWords[0]?.match(/^\d+\.\d+$/)) {
      versionWords = versionWords.slice(1)
    }
    
    // Remove seating data (5-seat, 5 seat, 7-seater, etc.)
    versionWords = versionWords.filter(word => 
      !word.match(/^\d+[-\s]?seats?e?r?$/i)
    )
    
    return versionWords.join(' ').trim()
  } catch (error) {
    return ""
  }
}

const extractTrimKeywords = (variant) => {
  // Extract meaningful keywords from JATO variant string
  // e.g., "4.0 TFSI RS 6 AVANT GT QUATTRO TIPTRONIC" -> ["TFSI", "RS", "AVANT", "GT", "QUATTRO"]
  return variant
    .toUpperCase()
    .split(/[\s\-\.]/)
    .filter(word => 
      word.length > 1 && 
      !word.match(/^\d+$/) && // Remove pure numbers
      !word.match(/^\d+\.\d+$/) // Remove decimals like "4.0"
    )
}

const calculateMatchScore = (vehicleKeywords, reviewKeywords) => {
  if (!reviewKeywords || reviewKeywords.length === 0) return 0
  
  const reviewKeywordsUpper = reviewKeywords.map(k => k.toUpperCase())
  let score = 0
  
  vehicleKeywords.forEach(keyword => {
    if (reviewKeywordsUpper.includes(keyword)) {
      score += 1
    }
  })
  
  return score
}

const findBestReviewMatch = (vehicle) => {
  // Step 1: Get all reviews for this make+model (case-insensitive)
  const candidateReviews = reviewsData.filter(review => 
    review.make_display?.toUpperCase() === vehicle.make_display?.toUpperCase() && 
    review.model_display?.toUpperCase() === vehicle.model_display?.toUpperCase()
  )
  
  if (candidateReviews.length === 0) return null
  if (candidateReviews.length === 1) return candidateReviews[0]
  
  // Step 2: Try exact variant matching using keywords
  const vehicleTrimKeywords = extractTrimKeywords(vehicle.variant)
  
  if (vehicleTrimKeywords.length > 0) {
    const exactMatch = candidateReviews.find(review => 
      calculateMatchScore(vehicleTrimKeywords, review.keywords || []) > 0
    )
    if (exactMatch) return exactMatch
  }
  
  // Step 3: Fallback to general model reviews (empty keywords only)
  const generalReviews = candidateReviews.filter(review => 
    !review.keywords || review.keywords.length === 0
  )
  
  if (generalReviews.length > 0) {
    return generalReviews.sort((a, b) => 
      new Date(b.publish_date) - new Date(a.publish_date)
    )[0]
  }
  
  // Step 4: Final fallback to most recent review if no general ones
  return candidateReviews.sort((a, b) => 
    new Date(b.publish_date) - new Date(a.publish_date)
  )[0]
}

const getPopularityScore = (vehicle) => {
  return reviewsData.filter(review => 
    review.make_display?.toUpperCase() === vehicle.make_display?.toUpperCase() && 
    review.model_display?.toUpperCase() === vehicle.model_display?.toUpperCase()
  ).length
}

const getRatingScore = (car) => {
  // Only apply rating score if we have exact variant match
  if (!car.hasReview || !car.isExactMatch) return 0
  
  switch(car.reviewRating) {
    case 'EXCELLENT': return 100
    case 'VERY GOOD': return 50  
    case 'GOOD': return 25
    case 'AVERAGE': return 10
    default: return 0
  }
}

const createDiverseResults = (rankedResults, maxResults = 10) => {
  // Group cars by make
  const groupedByMake = {}
  rankedResults.forEach(car => {
    if (!groupedByMake[car.make]) {
      groupedByMake[car.make] = []
    }
    groupedByMake[car.make].push(car)
  })
  
  const diverseResults = []
  const makes = Object.keys(groupedByMake)
  let roundIndex = 0
  
  // Keep cycling through makes until we have enough results
  while (diverseResults.length < maxResults) {
    let addedInThisRound = false
    
    // Try to add one car from each make in this round
    makes.forEach(make => {
      if (diverseResults.length >= maxResults) return
      
      const carsFromMake = groupedByMake[make]
      if (carsFromMake && carsFromMake.length > roundIndex) {
        diverseResults.push(carsFromMake[roundIndex])
        addedInThisRound = true
      }
    })
    
    // If no cars were added in this round, we're done
    if (!addedInThisRound) break
    
    roundIndex++
  }
  
  return diverseResults
}

// Mapping functions
const mapUseCasesToDatabase = (selections) => {
  const { selected, familyOptions, towingOptions, offRoadOptions } = selections.useCases || {}
  const dbUseCases = []
  
  if (!selected) return dbUseCases
  
  selected.forEach(useCase => {
    switch(useCase) {
      case 'family-life':
        if (familyOptions?.includes('5 seats') && familyOptions?.includes('6+ seats')) {
          dbUseCases.push('FAMILY_LIFE_5SEAT', 'FAMILY_LIFE_6PLUS')
        } else if (familyOptions?.includes('5 seats')) {
          dbUseCases.push('FAMILY_LIFE_5SEAT')
        } else if (familyOptions?.includes('6+ seats')) {
          dbUseCases.push('FAMILY_LIFE_6PLUS')
        }
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
        if (towingOptions?.includes('Light') && towingOptions?.includes('Heavy')) {
          dbUseCases.push('TOWING_LIGHT', 'TOWING_HEAVY')
        } else if (towingOptions?.includes('Light')) {
          dbUseCases.push('TOWING_LIGHT')
        } else if (towingOptions?.includes('Heavy')) {
          dbUseCases.push('TOWING_HEAVY')
        }
        break
      case 'off-road':
        if (offRoadOptions?.includes('Light') && offRoadOptions?.includes('Heavy')) {
          dbUseCases.push('OFFROAD_LIGHT', 'OFFROAD_HEAVY')
        } else if (offRoadOptions?.includes('Light')) {
          dbUseCases.push('OFFROAD_LIGHT')
        } else if (offRoadOptions?.includes('Heavy')) {
          dbUseCases.push('OFFROAD_HEAVY')
        }
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


const ResultsStep = () => {



  const navigate = useNavigate()
  const { selections, updateSelections } = useWizard()
  const [showMore, setShowMore] = useState(false)

  const stepLabels = ['Budget', 'Use', 'Body', 'Fuel', 'Features', 'Result']

  console.log('Total vehicles:', vehicleData.length)
console.log('Selections:', selections)

// Filter vehicles based on user selections
const filteredResults = vehicleData.filter(car => {
  // FIRST: Filter out cars with invalid pricing
  const price = parseFloat(car.retail_price)
  if (!price || price <= 0 || car.retail_price === "0" || car.retail_price === "unknown" || !car.retail_price) {
    return false
  }

  // Budget filter
if (selections.budget?.selection) {
  const price = parseFloat(car.retail_price) || 0
  const { type, selection } = selections.budget
  
  if (type === 'weekly') {
    // Use converted RRP ranges for weekly selections
    if (selections.budget.rrpMin !== undefined && price < selections.budget.rrpMin) return false
    if (selections.budget.rrpMax !== undefined && selections.budget.rrpMax !== Infinity && price > selections.budget.rrpMax) return false
  } else {
    // RRP mode - handle both single and multiple selections
    if (selection === 'custom') {
      const { customMin, customMax } = selections.budget
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
  const requiredUseCases = mapUseCasesToDatabase(selections)
if (requiredUseCases.length > 0) {
  const carUseCases = car.carexpert_use_cases || []

   // ADD THESE LINES HERE:
  console.log('Car use cases:', carUseCases)
  console.log('Required use cases:', requiredUseCases)
  
  // Separate categories that need OR logic
  const familyUseCases = requiredUseCases.filter(uc => uc.includes('FAMILY_LIFE'))
  const towingUseCases = requiredUseCases.filter(uc => uc.includes('TOWING'))
  const offRoadUseCases = requiredUseCases.filter(uc => uc.includes('OFFROAD'))
  const otherUseCases = requiredUseCases.filter(uc => 
    !uc.includes('FAMILY_LIFE') && !uc.includes('TOWING') && !uc.includes('OFFROAD'))

       // ADD THIS LINE HERE:
  console.log('Towing use cases:', towingUseCases)

       // AND ADD THE HILUX CHECK HERE:
  if (car.make_display === 'Toyota' && car.model_display === 'Hilux') {
    console.log('Hilux check - car use cases:', carUseCases)
    console.log('Hilux check - required:', requiredUseCases)
  }

  
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
  if (selections.bodyTypes?.length > 0) {
    if (!selections.bodyTypes.includes(car.carexpert_body_type)) return false
  }
  
  // Fuel type filter  
  if (selections.fuelTypes?.length > 0) {
    if (!selections.fuelTypes.includes(car.carexpert_fuel_type)) return false
  }
  
  // Features filter
  const requiredFeatures = mapFeaturesToDatabase(selections.features)
  if (requiredFeatures.length > 0) {
    const carFeatures = car.carexpert_features || {}
    const hasAllFeatures = requiredFeatures.every(feature => carFeatures[feature] === true)
    if (!hasAllFeatures) return false
  }
  
  return true
})

console.log('All selections:', selections)
console.log('Required use cases:', mapUseCasesToDatabase(selections))
console.log('Filtered results:', filteredResults.length, 'cars')

// Replace your current allResults creation with this:
const rankedResults = filteredResults.map(car => {
  const review = findBestReviewMatch(car)
  const vehicleTrimKeywords = extractTrimKeywords(car.variant)
  const isExactMatch = review && vehicleTrimKeywords.length > 0 && 
    calculateMatchScore(vehicleTrimKeywords, review.keywords || []) > 0
  
  return {
    id: car.id,
    year: car.year,
    make: car.make_display,
    model: car.model_display,
    originalJatoData: car, // Add the original JATO data
    trim: car.specifications?.["schema_local trim level"] === "-" ? "" : car.specifications?.["schema_local trim level"] || "",
    price: parseFloat(car.retail_price) || 0,
    fuelType: car.carexpert_fuel_type === 'plug_in_hybrid' ? 'PHEV' : 
   (car.carexpert_fuel_type ? car.carexpert_fuel_type.charAt(0).toUpperCase() + car.carexpert_fuel_type.slice(1).toLowerCase() : 'Unknown'),
    bodyType: getDisplayBodyType(car.carexpert_body_type),
    seating: getSeatingDisplay(car),
    hasReview: !!review,
    reviewRating: review?.rating || null,
    reviewUrl: review?.original_url || null,
    reviewAuthor: review?.author || null,
    reviewDate: review?.publish_date || null,
    isExactMatch: isExactMatch,
    popularityScore: getPopularityScore(car),
    ratingScore: getRatingScore({...car, hasReview: !!review, reviewRating: review?.rating, isExactMatch})
  }
}).sort((a, b) => {
  // Primary sort: Popularity (review count)
  if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore
  // Secondary sort: Rating score (only for exact matches)  
  if (b.ratingScore !== a.ratingScore) return b.ratingScore - a.ratingScore
  // Tertiary sort: Price (ascending)
  return a.price - b.price
})

// Apply make diversity
const allResults = createDiverseResults(rankedResults, 10)

const topResults = allResults.slice(0, 3)
const additionalResults = allResults.slice(3, 10)

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getRatingColor = (rating) => {
  switch (rating) {
    case 'EXCELLENT':
      return 'bg-green-100 text-green-800'
    case 'VERY GOOD':
      return 'bg-blue-100 text-blue-800'
    case 'GOOD':
      return 'bg-yellow-100 text-yellow-800'
    case 'AVERAGE':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}


  
  const CarCard = ({ car }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
    {/* Car title - split into two lines */}
<div className="mb-1">
  <h3 className="text-xl font-bold text-carexpert-black leading-tight">
    {getCleanMakeModel(car.originalJatoData)}
  </h3>
  <p className="text-sm text-gray-500 font-medium leading-tight">
    {getCleanVersion(car.originalJatoData)}
  </p>
</div>
    
    <div className="flex gap-4">
      {/* Car image placeholder - aligned with price */}
      <div className="w-24 h-20 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-2">
  <Car size={32} className="text-gray-400" />
</div>
      
      {/* Car details */}
      <div className="flex-1 min-w-0">
        <p className="text-xl font-semibold text-carexpert-red mb-2">
          {formatPrice(car.price)}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {car.fuelType}
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {car.bodyType}
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {car.seating}
          </span>
        </div>
        
        {car.hasReview && (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${getRatingColor(car.reviewRating)}`}>
              {car.reviewRating}
            </span>
            <button 
  onClick={() => window.open(car.reviewUrl, '_blank')}
  className="text-xs text-carexpert-red hover:text-red-700 flex items-center gap-1"
>
  Read review
  <ExternalLink size={12} />
</button>
          </div>
        )}
      </div>
    </div>
  </div>
)

  // Check if we have results
const hasResults = allResults.length > 0

  if (!hasResults) {
    // Empty state
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
                <div className="w-6 h-px bg-carexpert-red"></div>
                <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
                <div className="w-6 h-px bg-carexpert-red"></div>
                <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 px-3">
              {stepLabels.map((label, index) => (
                <div key={label} className="flex-1 text-center">
                  <span className="text-carexpert-red font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center px-5 pt-24 pb-32">
          <div className="text-center">
            <Car size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-carexpert-black mb-2">
              No cars found
            </h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your preferences to see more results
            </p>
          </div>
        </div>

        {/* Back button */}
        <div className="fixed bottom-20 left-0 right-0 bg-white pt-2 pb-6 border-t border-gray-100">
          <div className="px-5">
            <button
              onClick={() => navigate('/find/features')}
              className="w-full py-2 border border-gray-300 rounded-lg text-gray-600 font-medium"
            >
              Back
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    )
  }

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
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
              <div className="w-6 h-px bg-carexpert-red"></div>
              <div className="w-4 h-4 bg-carexpert-red rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 px-3">
            {stepLabels.map((label, index) => (
              <div key={label} className="flex-1 text-center">
                <span className="text-carexpert-red font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Fixed heading */}
        <div className="px-5 py-3">
          <h2 className="text-xl font-bold text-carexpert-black mb-2">
            Your recommended cars
          </h2>
          <p className="text-sm text-gray-600">
            Based on your preferences, here are the best matches
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pt-40 pb-32">
        {/* Top 3 results */}
        <div className="mb-6">
          
          {topResults.map((car) => (
  <CarCard key={car.id} car={car} />
))}
        </div>

        {/* Show more button */}
{!showMore && additionalResults.length > 0 && (
  <button
    onClick={() => setShowMore(true)}
    className="w-full py-3 border border-gray-300 rounded-lg text-gray-600 font-medium flex items-center justify-center gap-2 mb-6"
  >
    Show more results
    <ChevronDown size={16} />
  </button>
)}

        {/* Additional results */}
        {showMore && (
          <div>
            <h3 className="text-lg font-semibold text-carexpert-black mb-4">
              More options
            </h3>
            {additionalResults.map((car) => (
  <CarCard key={car.id} car={car} />
))}
          </div>
        )}
      </div>

      {/* Start Over button */}
<div className="fixed bottom-20 left-0 right-0 bg-white pt-2 pb-6 border-t border-gray-100">
  <div className="px-5">
    <button
      onClick={() => {
        // Reset all selections in context
        updateSelections('budget', null)
        updateSelections('useCases', [])
        updateSelections('bodyTypes', [])
        updateSelections('fuelTypes', [])
        updateSelections('features', [])
        // Navigate back to budget
        navigate('/find/budget')
      }}
      className="w-full py-2 bg-carexpert-red text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200"
    >
      Start Over
    </button>
  </div>
</div>

      <BottomNav />
    </div>
  )
}

export default ResultsStep