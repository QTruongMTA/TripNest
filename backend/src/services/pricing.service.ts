export const pricingService = {
  calculatePropertyTotal(input: {
    pricePerNight: { toNumber(): number };
    cleaningFee: { toNumber(): number } | null;
    checkIn: Date;
    checkOut: Date;
  }) {
    const nights =
      (input.checkOut.getTime() - input.checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    const stayPrice = nights * input.pricePerNight.toNumber();
    const cleaningFee = input.cleaningFee?.toNumber() ?? 0;

    return {
      nights,
      stayPrice,
      cleaningFee,
      totalPrice: stayPrice + cleaningFee,
    };
  },
};
