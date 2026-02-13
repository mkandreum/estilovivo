import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentMonth]);

  const formatDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toISOString().split('T')[0];
  };

  const isInRange = (day: number | null): boolean => {
    if (!day || !startDate || !endDate) return false;
    const dateStr = formatDate(day);
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isSelected = (day: number | null): boolean => {
    if (!day) return false;
    const dateStr = formatDate(day);
    return dateStr === startDate || dateStr === endDate;
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(day);
    if (selectingStart) {
      onStartDateChange(dateStr);
      // Auto-move to end date selection
      if (!endDate || dateStr > endDate) {
        setSelectingStart(false);
      }
    } else {
      if (dateStr >= startDate) {
        onEndDateChange(dateStr);
        setSelectingStart(true);
      }
    }
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-700 capitalize">{monthName}</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft size={18} className="text-gray-400" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                !day
                  ? 'invisible'
                  : isSelected(day)
                  ? 'bg-pink-500 text-white shadow-md'
                  : isInRange(day)
                  ? 'bg-pink-100 text-gray-700'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Date display */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">Inicio</p>
          <p className="text-sm font-bold text-gray-800">
            {startDate ? new Date(startDate).toLocaleDateString('es-ES') : 'Seleccionar'}
          </p>
        </div>
        <div className="h-px bg-gray-200" />
        <div>
          <p className="text-xs text-gray-400 mb-1">Fin</p>
          <p className="text-sm font-bold text-gray-800">
            {endDate ? new Date(endDate).toLocaleDateString('es-ES') : 'Seleccionar'}
          </p>
        </div>
      </div>

      {/* Selection indicator */}
      <div className="mt-4 flex justify-center gap-1">
        <div className={`w-2 h-2 rounded-full transition ${selectingStart ? 'bg-pink-500' : 'bg-gray-300'}`} />
        <div className={`w-2 h-2 rounded-full transition ${!selectingStart ? 'bg-pink-500' : 'bg-gray-300'}`} />
      </div>
    </div>
  );
};

export default DateRangePicker;
