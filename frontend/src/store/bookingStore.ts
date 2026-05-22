import { create } from "zustand";
type BookingState = { guests: number; setGuests: (guests: number) => void };
export const useBookingStore = create<BookingState>((set) => ({ guests: 1, setGuests: (guests) => set({ guests }) }));
