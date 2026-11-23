/** LOCAL GUI ONLY: fictional identities shared by the two local test aliases. */
export const LOCAL_GUI_PASSWORD = 'LocalOnly123!';
export const LOCAL_GUI_STORAGE_KEY = 'store-app.local-gui.identity.v1';
export const LOCAL_GUI_PROJECT = 'store-local-gui-fake';
export const LOCAL_GUI_ACCOUNTS = [
  { uid: 'local-gui-owner', email: 'owner@example.test', name: 'Local GUI Annual Owner' },
  { uid: 'local-gui-fresh', email: 'fresh@example.test', name: 'Local GUI New Account' },
  { uid: 'local-gui-expired', email: 'expired@example.test', name: 'Local GUI Expired Trial' },
] as const;

export function localGuiIdentity(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[a-z0-9._+-]+@example\.test$/.test(normalized)) {
    throw new Error('LOCAL GUI ONLY: use a fictional @example.test address');
  }
  const known = LOCAL_GUI_ACCOUNTS.find(account => account.email === normalized);
  return known ?? {
    uid: `local-gui-new-${normalized.split('@')[0]}`,
    email: normalized,
    name: 'Local GUI Fictional Account',
  };
}

export function localGuiToken(identity: ReturnType<typeof localGuiIdentity>) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'LOCAL_GUI_ONLY', typ: 'JWT' })}.${encode({
    sub: identity.uid, email: identity.email, email_verified: true, name: identity.name,
    aud: LOCAL_GUI_PROJECT, iat: now, auth_time: now, exp: now + 3600,
  })}.local-gui-not-a-real-signature`;
}
