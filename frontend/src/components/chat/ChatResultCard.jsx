import { ExternalLink } from 'lucide-react';

const ChatResultCard = ({ vehicle, rank }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-carexpert-red text-white rounded-lg flex items-center justify-center font-bold text-sm">
          {rank}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-xs text-gray-600">{vehicle.variant}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-gray-900">
          {formatPrice(vehicle.price)}
        </div>
        <div className="text-xs text-green-600 font-medium">
          {vehicle.matchConfidence}% match
        </div>
      </div>
    </div>

    {/* Specs and Review - single row */}
    <div className="flex items-center justify-between">
      {/* Left: Specs */}
      <div className="flex gap-2 text-xs">
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
          {capitalize(vehicle.bodyType)}
        </span>
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
          {capitalize(vehicle.fuelType)}
        </span>
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
          {vehicle.seats} seats
        </span>
      </div>

      {/* Right: Review */}
      {vehicle.hasReview && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded font-medium ${getRatingColor(vehicle.reviewRating)}`}>
            {vehicle.reviewRating}
          </span>
          <button 
            onClick={() => window.open(vehicle.reviewUrl, '_blank')}
            className="text-xs text-carexpert-red hover:text-red-700 flex items-center gap-1"
          >
            Read review
            <ExternalLink size={12} />
          </button>
        </div>
      )}
    </div>
  </div>
);
};

export default ChatResultCard;