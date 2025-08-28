// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// ثبّت الريجون بوضوح
const REGION = 'us-central1';

// دومينات مسموحة من الواجهة بدون تسجيل
const ALLOWED_ORIGINS = new Set([
  'https://salahaltaee.github.io',
  // للتجارب محلياً (اختياري)
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

/** تنظيف/تهيئة بروفايل المستخدم */
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

/** السماح بالوصول:
 *  - أدمن (custom claim role=admin) ✅
 *  - أو طلب جاي من الدومينات المسموحة (GitHub Pages) حتى لو بدون Auth ✅
 */
function assertCanManage(context) {
  try {
    // أدمن؟
    if (context.auth?.token?.role === 'admin') return;

    const headers = context.rawRequest?.headers || {};
    const originOrRef = headers.origin || headers.referer || '';
    let originHost = '';

    try {
      const u = new URL(originOrRef);
      originHost = `${u.protocol}//${u.host}`;
    } catch (e) {
      // إذا ما نقدر نقرأ الـ URL نخليها فاضية
    }

    if (ALLOWED_ORIGINS.has(originHost)) return;

    throw new functions.https.HttpsError('permission-denied', 'Admins only');
  } catch (e) {
    // سجّل السبب حتى لو رجع للعميل كـ internal
    console.error('assertCanManage error', e);
    if (e instanceof functions.https.HttpsError) throw e;
    throw new functions.https.HttpsError('permission-denied', 'Admins only');
  }
}

// ====== الدوال ======

exports.adminListUsers = functions.region(REGION).https.onCall(async (data, context) => {
  assertCanManage(context);
  try {
    const snap = await db.collection('users').orderBy('displayName').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { users };
  } catch (e) {
    console.error('adminListUsers failed', e);
    throw new functions.https.HttpsError('internal', 'list-failed');
  }
});

exports.adminCreateUser = functions.region(REGION).https.onCall(async (data, context) => {
  assertCanManage(context);
  const { email, password, profile = {} } = data || {};
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'email and password are required');
  }
  try {
    const userRecord = await admin.auth().createUser({
      email, password, displayName: profile.displayName || ''
    });
    const uid = userRecord.uid;

    const role = profile.role || 'tech';
    await admin.auth().setCustomUserClaims(uid, { role });

    const doc = sanitizeProfile({ ...profile, email });
    await db.collection('users').doc(uid).set(doc, { merge: true });

    return { uid };
  } catch (e) {
    console.error('adminCreateUser failed', e);
    throw new functions.https.HttpsError('internal', 'create-failed');
  }
});

exports.adminUpdateUser = functions.region(REGION).https.onCall(async (data, context) => {
  assertCanManage(context);
  const { uid, email, password, profile = {} } = data || {};
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required');

  try {
    const update = {};
    if (email) update.email = email;
    if (profile.displayName) update.displayName = profile.displayName;
    if (password) update.password = password;
    if (Object.keys(update).length) await admin.auth().updateUser(uid, update);

    if (profile.role) await admin.auth().setCustomUserClaims(uid, { role: profile.role });

    const doc = sanitizeProfile({ ...profile, email: email || profile.email });
    await db.collection('users').doc(uid).set(doc, { merge: true });

    return { ok: true };
  } catch (e) {
    console.error('adminUpdateUser failed', e);
    throw new functions.https.HttpsError('internal', 'update-failed');
  }
});

exports.adminDeleteUser = functions.region(REGION).https.onCall(async (data, context) => {
  assertCanManage(context);
  const { uid } = data || {};
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required');

  try {
    await db.collection('users').doc(uid).delete().catch(() => {});
    await admin.auth().deleteUser(uid);
    return { ok: true };
  } catch (e) {
    console.error('adminDeleteUser failed', e);
    throw new functions.https.HttpsError('internal', 'delete-failed');
  }
});
