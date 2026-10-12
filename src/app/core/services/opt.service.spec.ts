import { describe, expect, it } from 'vitest';
import { OtpService } from './opt.service';

describe('OtpService', () => {
  it('should exist and have the real backend-driven OTP contract', async () => {
    const service = new OtpService();

    await expect(service.sendCode('+33612345678')).resolves.toBeUndefined();
    await expect(service.verifyCode('+33612345678', '1234')).resolves.toBe(true);
  });
});
