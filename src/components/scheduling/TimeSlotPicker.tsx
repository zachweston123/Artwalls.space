import { Clock, X } from 'lucide-react';

interface TimeSlotPickerProps {
  isOpen: boolean;
  onClose: () => void;
  windowDay: string;
  startTime: string;
  endTime: string;
  type: 'install' | 'pickup';
  artworkTitle: string;
  onConfirm: (time: string) => void;
}

export function TimeSlotPicker({
  isOpen,
  onClose,
  windowDay,
  startTime,
  endTime,
  type,
  artworkTitle,
  onConfirm,
}: TimeSlotPickerProps) {
  const [selectedSlot, setSelectedSlot] = React.useState<string>('');

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const end = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1]);
    
    let currentHour = start;
    let currentMinute = startMinute;
    
    while (
      currentHour < end || 
      (currentHour === end && currentMinute < endMinute)
    ) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      const displayTime = formatTime(timeString);
      slots.push(timeString);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    
    return slots;
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      onConfirm(selectedSlot);
      onClose();
    }
  };

  if (!isOpen) return null;

  const slots = generateTimeSlots();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal - Desktop / Bottom Sheet - Mobile */}
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div className="bg-white dark:bg-neutral-800 rounded-t-2xl lg:rounded-2xl max-w-lg w-full lg:max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h3 className="text-xl mb-1 text-neutral-900 dark:text-neutral-50">Schedule {type === 'install' ? 'Install' : 'Pickup'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{artworkTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Window Info */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-200 mb-1">Install/Pickup Window</p>
                <p className="text-blue-700 dark:text-blue-300">
                  {windowDay}s, {formatTime(startTime)} – {formatTime(endTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="p-6 max-h-[50vh] lg:max-h-96 overflow-y-auto">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              Select a 30-minute time slot for this week's {windowDay.toLowerCase()}:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedSlot === slot
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 hover:bg-neutral-50 dark:bg-neutral-900'
                  }`}
                >
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:bg-neutral-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedSlot}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Time
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Need to import React for useState
import React from 'react';
