/** LOCAL GUI ONLY. Replaces firebase/auth only in vite.gui.config.ts. */
import {
  LOCAL_GUI_PASSWORD, LOCAL_GUI_STORAGE_KEY, LOCAL_GUI_ACCOUNTS,
  localGuiIdentity, localGuiToken,
} from './identities';

if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
  throw new Error('LOCAL GUI auth mock refuses non-loopback origins');
}

type Identity = ReturnType<typeof localGuiIdentity>;
export type User = Identity & {
  displayName: string;
  emailVerified: true;
  photoURL: null;
  isAnonymous: false;
  getIdToken: () => Promise<string>;
  reload: () => Promise<void>;
}
export interface Auth { currentUser: User | null }
const listeners = new Set<(user: User | null) => void>();
function makeUser(identity: Identity): User {
  return { ...identity, displayName: identity.name, emailVerified: true, photoURL: null,
    isAnonymous: false, getIdToken: async () => localGuiToken(identity), reload: async () => {} };
}
function storedUser(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_GUI_STORAGE_KEY);
    if (!raw) return null;
    return makeUser(localGuiIdentity(JSON.parse(raw).email));
  } catch { return null; }
}
export const auth: Auth = { currentUser: storedUser() };
function change(user: User | null) {
  auth.currentUser = user;
  if (user) localStorage.setItem(LOCAL_GUI_STORAGE_KEY, JSON.stringify({ email: user.email }));
  else localStorage.removeItem(LOCAL_GUI_STORAGE_KEY);
  for (const listener of listeners) listener(user);
}
window.addEventListener('storage', event => {
  if (event.key === LOCAL_GUI_STORAGE_KEY) change(storedUser());
});
export class GoogleAuthProvider {}
export class EmailAuthProvider {
  static credential(email: string, password: string) { return { email, password }; }
}
export const browserLocalPersistence = 'local-gui-only';
export const getAuth = () => auth;
export const setPersistence = async () => {};
export function onAuthStateChanged(_auth: Auth, callback: (user: User | null) => void) {
  listeners.add(callback);
  queueMicrotask(() => { if (listeners.has(callback)) callback(auth.currentUser); });
  return () => { listeners.delete(callback); };
}
export async function signInWithEmailAndPassword(_auth: Auth, email: string, password: string) {
  if (password !== LOCAL_GUI_PASSWORD) {
    throw Object.assign(new Error('LOCAL GUI password is LocalOnly123!'), { code: 'auth/invalid-credential' });
  }
  const user = makeUser(localGuiIdentity(email));
  change(user);
  return { user };
}
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export async function signInWithPopup(_auth: Auth, _provider: GoogleAuthProvider, _resolver?: unknown) {
  const user = makeUser(LOCAL_GUI_ACCOUNTS[0]);
  change(user);
  return { user };
}
export async function signOut() { change(null); }
export async function sendPasswordResetEmail(_auth: Auth, email: string) {
  localGuiIdentity(email); // Validation only; no email is ever sent.
}
export async function getIdToken(user: User) { return user.getIdToken(); }
export async function reload() {}
export async function reauthenticateWithCredential(_user: User, credential: { email: string; password: string }) {
  if (credential.password !== LOCAL_GUI_PASSWORD) {
    throw Object.assign(new Error('LOCAL GUI wrong password'), { code: 'auth/wrong-password' });
  }
  return { user: auth.currentUser };
}
export async function updateEmail(_user: User, email: string) {
  localGuiIdentity(email); // Validation only; the token identity follows the stored email.
  change(makeUser(localGuiIdentity(email)));
}
export async function verifyBeforeUpdateEmail(_user: User, email: string) {
  localGuiIdentity(email); // Validation only; no verification email is sent in local GUI.
}
