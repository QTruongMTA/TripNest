import type { Request, Response } from "express";

type RubyTravelTipsPayload = {
  success: boolean;
  source: string;
  data?: {
    province: string;
    tips: string[];
  };
};

const defaultRubyApiUrl = "http://localhost:4567/api/v1/ruby";

function getProvinceParam(req: Request) {
  const province = req.query.province;
  return typeof province === "string" && province.trim() ? province.trim() : "Da Nang";
}

export const rubyDemoController = {
  async travelTips(req: Request, res: Response) {
    const rubyApiUrl = (process.env.RUBY_API_URL ?? defaultRubyApiUrl).replace(/\/$/, "");
    const url = new URL(`${rubyApiUrl}/travel_tips`);
    url.searchParams.set("province", getProvinceParam(req));

    try {
      const rubyResponse = await fetch(url);

      if (!rubyResponse.ok) {
        return res.status(502).json({
          error: {
            code: "RUBY_API_ERROR",
            message: "Ruby on Rails API is not responding correctly",
          },
        });
      }

      const rubyPayload = (await rubyResponse.json()) as RubyTravelTipsPayload;

      return res.json({
        ...rubyPayload,
        proxiedBy: "tripnest-node-backend",
      });
    } catch {
      return res.status(503).json({
        error: {
          code: "RUBY_API_UNAVAILABLE",
          message: "Ruby on Rails API is offline. Start ruby-api on port 4567.",
        },
      });
    }
  },
};
