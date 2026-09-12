import { securityApi } from '../../services/advanced-api';

export async function loadSecurityCenter() {
  const [twoFactor, devices, loginHistory, passkeys] = await Promise.all([
    securityApi.twoFactorStatus(),
    securityApi.devices(),
    securityApi.loginHistory(),
    securityApi.passkeys()
  ]);
  return { twoFactor, devices, loginHistory, passkeys };
}

export const securityActions = securityApi;
