// Cloud Functions for Firebase (Node.js 18)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

/** تنظيف/تهيئة بروفايل المستخدم قبل الحفظ */
function sanitizeProfile(p = {}) {
  return {
    displayName: p.displayName || '',
    email: p.email || undefined,
    phone: p.phone || '',
    role: p.role || 'tech',
    buildingScope: Array.isArray(p.buildingScope) ? p.buildingScope : [],
    skills: Array.isArray(p.skills) ? p.skills : [],
    isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * السماح بالوصول:
 * - إذا المستخدم أدمن (عن طريق custom claims) ✅
 * - أو إذا الطلب جاي من GitHub Pages الخاص بك والدخول مجهول ✅
 * - غير ذلك ❌
 */
function assertCanManage(context) {
  const origin = context.rawRequest?.headers?.origin || '';
  const allowed = ['https://salahaltaee.github.io', 'https://empiror-hills-alpha.web.app'];
  const isAllowedOrigin = allowed.includes(origin);

  // أدمن؟
  if (context.auth?.token?.role === 'admin') return;

  // مجهول + دومين مسموح
  if (!context.auth && isAllowedOrigin) return;

  throw new functions.https.HttpsError('permission-denied', 'Admins only');
}

exports.adminCreateUser = functions.https.onCall(async (data, context) => {
  assertCanManage(context);

  const { email, password, profile = {} } = data || {};
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'email and password are required');
  }

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: profile.displayName || '',
  });
  const uid = userRecord.uid;

  const role = profile.role || 'tech';
  await admin.auth().setCustomUserClaims(uid, { role });

  const doc = sanitizeProfile({ ...profile, email });
  await db.collection('users').doc(uid).set(doc, { merge: true });

  return { uid };
});

exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
  assertCanManage(context);

  const { uid, email, password, profile = {} } = data || {};
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required');

  const update = {};
  if (email) update.email = email;
  if (profile.displayName) update.displayName = profile.displayName;
  if (password) update.password = password;
  if (Object.keys(update).length) {
    await admin.auth().updateUser(uid, update);
  }

  if (profile.role) {
    await admin.auth().setCustomUserClaims(uid, { role: profile.role });
  }

  const doc = sanitizeProfile({ ...profile, email: email || profile.email });
  await db.collection('users').doc(uid).set(doc, { merge: true });

  return { ok: true };
});

exports.adminDeleteUser = functions.https.onCall(async (data, context) => {
  assertCanManage(context);

  const { uid } = data || {};
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required');

  await db.collection('users').doc(uid).delete().catch(() => {});
  await admin.auth().deleteUser(uid);
  return { ok: true };
});
