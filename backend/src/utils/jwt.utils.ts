import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
  sub: string;
  role: string;
  email: string;
};

const jwtSecret = () => process.env.JWT_SECRET ?? "development-secret";

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, jwtSecret()) as AccessTokenPayload;
}
