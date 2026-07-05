export const pricingService = {
  calculatePropertyTotal(input: {
    pricePerNight: { toNumber(): number };
    cleaningFee: { toNumber(): number } | null;
    checkIn: Date;
    checkOut: Date;
    dailyRates?: Array<{ date: Date | string; pricePerNight: { toNumber(): number } | number | string }>;
  }) {
    const nights =
      (input.checkOut.getTime() - input.checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    const dailyRateMap = new Map(
      (input.dailyRates ?? []).map((rate) => [
        toDateKey(rate.date),
        toNumber(rate.pricePerNight),
      ])
    );
    const stayPrice = Array.from({ length: nights }, (_, index) => {
      const date = new Date(input.checkIn);
      date.setUTCDate(input.checkIn.getUTCDate() + index);
      return dailyRateMap.get(toDateKey(date)) ?? input.pricePerNight.toNumber();
    }).reduce((total, price) => total + price, 0);
    const cleaningFee = input.cleaningFee?.toNumber() ?? 0;

    return {
      nights,
      stayPrice,
      cleaningFee,
      totalPrice: stayPrice + cleaningFee,
    };
  },
};

function toNumber(value: { toNumber(): number } | number | string) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

function toDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
