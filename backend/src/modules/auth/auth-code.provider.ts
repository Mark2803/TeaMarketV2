/**
 * Интерфейс провайдера отправки кодов авторизации.
 *
 * Реальная интеграция с SMS-сервисом должна реализовать
 * этот же контракт.
 */
export interface AuthCodeProvider {
  sendCode(
    phone: string,
    code: string
  ): Promise<void>;
}

/**
 * Тестовый провайдер для разработки.
 *
 * Код не отправляется по SMS,
 * а выводится в консоль backend.
 */
class TestAuthCodeProvider
  implements AuthCodeProvider {
  async sendCode(
    phone: string,
    code: string
  ): Promise<void> {
    console.log(
      `[AUTH TEST] Код для ${phone}: ${code}`
    );
  }
}

export const authCodeProvider:
AuthCodeProvider =
  new TestAuthCodeProvider();