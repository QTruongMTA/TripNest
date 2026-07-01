export interface RatePlanAdjustment {
  priceAdjustmentType: "NONE" | "PERCENT" | "FIXED";
  priceAdjustmentValue: number; // PERCENT: e.g. -10 = 10% off; FIXED: per-night delta in VND
}

export const pricingService = {
  calculatePropertyTotal(input: {
    pricePerNight: { toNumber(): number };
    cleaningFee: { toNumber(): number } | null;
    checkIn: Date;
    checkOut: Date;
    dailyRates?: Map<string, number | null>; // date-key → override price (null = use base)
    ratePlan?: RatePlanAdjustment | null;
  }) {
    const nights =
      (input.checkOut.getTime() - input.checkIn.getTime()) /
      (1000 * 60 * 60 * 24);
    const basePrice = input.pricePerNight.toNumber();

    let stayPrice = 0;
    const cursor = new Date(input.checkIn);
    while (cursor < input.checkOut) {
      const key = cursor.toISOString().slice(0, 10);

      // Effective nightly price: daily rate override or base price
      let nightPrice = basePrice;
      if (input.dailyRates) {
        const override = input.dailyRates.get(key);
        if (override != null) nightPrice = override;
      }

      // Apply rate plan adjustment on top of effective price
      if (input.ratePlan && input.ratePlan.priceAdjustmentType !== "NONE") {
        const adj = input.ratePlan.priceAdjustmentValue;
        if (input.ratePlan.priceAdjustmentType === "PERCENT") {
          nightPrice = nightPrice * (1 + adj / 100);
        } else {
          // FIXED: per-night delta
          nightPrice = nightPrice + adj;
        }
        nightPrice = Math.max(0, nightPrice);
      }

      stayPrice += nightPrice;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const cleaningFee = input.cleaningFee?.toNumber() ?? 0;
    return { nights, stayPrice, cleaningFee, totalPrice: stayPrice + cleaningFee };
  },
};
