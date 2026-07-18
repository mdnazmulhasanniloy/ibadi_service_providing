type FlexibleSlot = {
  key: string;
  startHour: number;
  endHour: number;
  label: string;
};

export const formatHour = (hour: number): string => {
  const normalizedHour = hour % 24;
  const period = normalizedHour >= 12 ? 'PM' : 'AM';

  const displayHour = normalizedHour % 12 || 12;

  return `${displayHour}:00 ${period}`;
};

export const generateFlexibleSlots = (duration: number): FlexibleSlot[] => {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 24) {
    return [];
  }

  const slots: FlexibleSlot[] = [];

  for (let startHour = 0; startHour + duration <= 24; startHour += duration) {
    const endHour = startHour + duration;

    slots.push({
      key: `${startHour}-${endHour}`,
      startHour,
      endHour,
      label: `${formatHour(startHour)} - ${formatHour(endHour)}`,
    });
  }

  return slots;
};
