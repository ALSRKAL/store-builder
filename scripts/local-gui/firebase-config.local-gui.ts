/** LOCAL GUI ONLY: never initializes Firebase, FCM or a service worker. */
import { auth, GoogleAuthProvider } from './firebase-auth.local-gui';
export { auth };
export const googleProvider = new GoogleAuthProvider();
export const googlePopupResolver = undefined;
export const getFirebaseMessaging = () => null;
export const getFCMToken = async () => null;
export const onFCMMessage = (_callback: unknown) => null;
export default { name: 'local-gui-fake-firebase', options: { projectId: 'store-local-gui-fake' } };
