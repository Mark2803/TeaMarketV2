import { HttpError } from "../../middleware/error-handler.js";
import { sendTemplateEmail } from "../notifications/notification.service.js";

export interface AuthCodeProvider {
  sendPhoneCode(phone: string, code: string): Promise<void>;
  sendEmailCode(email: string, code: string): Promise<void>;
}

class DefaultAuthCodeProvider implements AuthCodeProvider {
  async sendPhoneCode(phone: string, code: string): Promise<void> {
    // SMS-провайдер не подключён. Код в логах допустим только при локальной
    // разработке: в production это позволило бы войти в чужой аккаунт по логам.
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(503, "PHONE_AUTH_UNAVAILABLE", "Вход по телефону временно недоступен. Используйте email.");
    }
    console.log(`[AUTH TEST] Код для ${phone}: ${code}`);
  }
  async sendEmailCode(email: string, code: string): Promise<void> {
    const result = await sendTemplateEmail(
      "registration_confirmation",
      email,
      { code, expires_minutes: 5 }
    );
    if (!result.sent) {
      throw new Error("Email-уведомления отключены или письмо не отправлено");
    }
  }
}

export const authCodeProvider: AuthCodeProvider = new DefaultAuthCodeProvider();
