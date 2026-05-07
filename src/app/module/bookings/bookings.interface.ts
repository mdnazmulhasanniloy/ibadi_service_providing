export interface BookingDay {
  day: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export interface CreateBookingPayload {
  userId: string;
  providerId: string;
  price: number;
  startDate: string;
  totalHours: number;
  bookingType: string;
  bookingDays: BookingDay[];
}

 