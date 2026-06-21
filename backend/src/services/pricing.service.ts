export const pricingService = {
  calculatePropertyTotal(input: {
    pricePerNight: { toNumber(): number };
    cleaningFee: { toNumber(): number } | null;
    checkIn: Date;
    checkOut: Date;
    dailyRates?: Array<{ date: Date; price: { toNumber(): number } }>;
    guests?: number;
    services?: {
      breakfast?: boolean;
      airportTransfer?: boolean;
    };
  }) {
    const customRates = new Map(
      (input.dailyRates ?? []).map((rate) => [
        rate.date.toISOString().slice(0, 10),
        rate.price.toNumber(),
      ])
    );
    const nightlyBreakdown: Array<{ date: string; price: number; customRate: boolean }> = [];
    const cursor = new Date(input.checkIn);

    while (cursor < input.checkOut) {
      const date = cursor.toISOString().slice(0, 10);
      const customPrice = customRates.get(date);
      nightlyBreakdown.push({
        date,
        price: customPrice ?? input.pricePerNight.toNumber(),
        customRate: customPrice !== undefined,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const nights = nightlyBreakdown.length;
    const stayPrice = nightlyBreakdown.reduce((sum, item) => sum + item.price, 0);
    const cleaningFee = input.cleaningFee?.toNumber() ?? 0;
    const guests = Math.max(1, input.guests ?? 1);
    const selectedServices = {
      breakfast: input.services?.breakfast === true,
      airportTransfer: input.services?.airportTransfer === true,
    };
    const extras = [
      ...(selectedServices.breakfast
        ? [{
            code: "BREAKFAST",
            label: "Bữa sáng",
            quantity: guests * nights,
            unitPrice: 120000,
            total: guests * nights * 120000,
          }]
        : []),
      ...(selectedServices.airportTransfer
        ? [{
            code: "AIRPORT_TRANSFER",
            label: "Đưa đón sân bay",
            quantity: 1,
            unitPrice: 350000,
            total: 350000,
          }]
        : []),
    ];
    const extrasPrice = extras.reduce((sum, item) => sum + item.total, 0);
    const taxableSubtotal = stayPrice + cleaningFee + extrasPrice;
    const serviceFeeRate = Number(process.env["BOOKING_SERVICE_FEE_RATE"] ?? 0.05);
    const vatRate = Number(process.env["BOOKING_VAT_RATE"] ?? 0.08);
    const serviceFee = Math.round(taxableSubtotal * serviceFeeRate);
    const vatAmount = Math.round((taxableSubtotal + serviceFee) * vatRate);
    const totalPrice = taxableSubtotal + serviceFee + vatAmount;

    return {
      nights,
      stayPrice,
      cleaningFee,
      extras,
      extrasPrice,
      serviceFeeRate,
      serviceFee,
      vatRate,
      vatAmount,
      discountAmount: 0,
      totalPrice,
      selectedServices,
      nightlyBreakdown,
    };
  },
};
