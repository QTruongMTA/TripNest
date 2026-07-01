import nodemailer from "nodemailer";

const SMTP_HOST     = process.env.SMTP_HOST     ?? "smtp.gmail.com";
const SMTP_PORT     = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER     = process.env.SMTP_USER     ?? "";
const SMTP_PASS     = process.env.SMTP_PASS     ?? "";
const EMAIL_FROM    = process.env.EMAIL_FROM    ?? `"TripNest" <noreply@tripnest.vn>`;
const FRONTEND_URL  = process.env.FRONTEND_URL  ?? "http://localhost:3000";

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export const emailService = {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    const transport = createTransport();
    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject: "Xác thực email TripNest",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#16a34a">Xác thực địa chỉ email</h2>
          <p>Nhấn nút bên dưới để xác thực email và kích hoạt tài khoản TripNest của bạn.</p>
          <p style="margin:24px 0">
            <a href="${verifyUrl}"
               style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600">
              Xác thực email
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">
            Link có hiệu lực trong 24 giờ. Nếu bạn không tạo tài khoản TripNest, hãy bỏ qua email này.
          </p>
          <p style="font-size:12px;color:#9ca3af">Hoặc copy link: ${verifyUrl}</p>
        </div>
      `,
    });
  },

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    const transport = createTransport();
    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject: "Đặt lại mật khẩu TripNest",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#16a34a">Đặt lại mật khẩu</h2>
          <p>Nhấn nút bên dưới để đặt lại mật khẩu TripNest của bạn.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600">
              Đặt lại mật khẩu
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">Link có hiệu lực trong 1 giờ.</p>
        </div>
      `,
    });
  },
};
