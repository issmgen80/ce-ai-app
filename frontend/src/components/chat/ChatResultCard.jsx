import { ExternalLink, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const ChatResultCard = ({ vehicle, rank }) => {
  const [showReasoning, setShowReasoning] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

 

  const formatFuelType = (fuelType) => {
  if (!fuelType) return 'Unknown';
  
  if (fuelType === 'plug_in_hybrid') return 'Plug-in Hybrid';
  
  return fuelType.charAt(0).toUpperCase() + fuelType.slice(1).toLowerCase();
};

const formatBodyType = (bodyType) => {
  if (!bodyType) return 'Unknown';
  
  const typeMap = {
    'suv': 'SUV',
    'hatchback': 'Hatch',
  };
  
  const normalized = bodyType.toLowerCase();
  return typeMap[normalized] || bodyType.charAt(0).toUpperCase() + bodyType.slice(1).toLowerCase();
};

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800';
      case 'VERY GOOD':
        return 'bg-blue-100 text-blue-800';
      case 'GOOD':
        return 'bg-yellow-100 text-yellow-800';
      case 'AVERAGE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-3">
        {/* Header: Name, Price */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">
              {vehicle.make} {vehicle.model} {vehicle.variant}
            </h3>
            {/* Specs row */}
            <div className="flex gap-2 text-xs">
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
  {formatBodyType(vehicle.bodyType)}
</span>
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
  {formatFuelType(vehicle.fuelType)}
</span>
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                {vehicle.seats} seats
              </span>
            </div>
          </div>
          
          <div className="text-right ml-4 flex-shrink-0">
            <div className="mb-1 flex justify-end">
              <span className="text-lg font-bold text-gray-900">{formatPrice(vehicle.price)}</span>
              <span className="text-xs text-gray-500 font-medium ml-1">MSRP</span>
            </div>
            {vehicle.carexpertUrl && (
              <button 
                onClick={() => window.open(vehicle.carexpertUrl, '_blank')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-carexpert-red text-white hover:bg-red-700 rounded-lg text-xs font-medium transition-colors ml-auto"
              >
                More info
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom section: AI Insight and Rating */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {vehicle.reasoning && (
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Lightbulb size={13} />
                <span>AI Insight</span>
                {showReasoning ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            {vehicle.hasReview && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-600 font-medium">
                  CarExpert Rating:
                </span>
                <span className={`text-xs px-2.5 py-1 rounded font-medium ${getRatingColor(vehicle.reviewRating)}`}>
                  {vehicle.reviewRating}
                </span>
              </div>
            )}
          </div>

          {/* AI Insight expandable reasoning */}
          {showReasoning && vehicle.reasoning && (
            <div className="mt-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {vehicle.reasoning}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatResultCard;