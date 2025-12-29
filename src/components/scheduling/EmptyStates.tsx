import { AlertCircle, Calendar } from 'lucide-react';

export function NoSlotsAvailableEmptyState() {
  return (
    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
        <div>
          <h3 className="text-base text-yellow-900 mb-2">No Time Slots Available This Week</h3>
          <p className="text-sm text-yellow-700 mb-3">
            All time slots for this week are fully booked. You can schedule for next week's window.
          </p>
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <Calendar className="w-4 h-4" />
            <span>Next available: Thursday, Jan 2, 4:00-6:00 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SoldAwaitingPickupEmptyState() {
  return (
    <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
        <div>
          <h3 className="text-base text-orange-900 mb-2">Artwork Sold - Pickup Required</h3>
          <p className="text-sm text-orange-700 mb-3">
            Congratulations! This artwork has been sold. Please coordinate with the venue to pick up your piece during their weekly pickup window.
          </p>
          <div className="space-y-2 text-sm text-orange-800">
            <p><strong>Next Steps:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Schedule a pickup time within the venue's weekly window</li>
              <li>Bring appropriate packing materials</li>
              <li>Check in with venue staff upon arrival</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
