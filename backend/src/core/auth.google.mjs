import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb } from '../db.mjs';
import { sanitizeUserForClient } from '../../shared/userTypes.mjs';

/**
 * إعداد Google OAuth Strategy
 * @param {string} clientID - Google Client ID
 * @param {string} clientSecret - Google Client Secret
 * @param {string} callbackURL - URL للعودة بعد المصادقة
 */
export function setupGoogleAuth(clientID, clientSecret, callbackURL) {
  if (!clientID || !clientSecret) {
    console.warn('⚠️  Google OAuth credentials not configured. Google login will be disabled.');
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const db = getDb();
          const usersCollection = db.collection('users');

          // استخراج المعلومات من ملف Google الشخصي
          const email = profile.emails?.[0]?.value;
          const displayName = profile.displayName;
          const googleId = profile.id;
          const profilePhoto = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          // البحث عن المستخدم في قاعدة البيانات
          let user = await usersCollection.findOne({ email: email.toLowerCase() });

          if (user) {
            // المستخدم موجود - تحديث معلومات Google إذا لزم الأمر
            if (!user.googleId) {
              await usersCollection.updateOne(
                { _id: user._id },
                {
                  $set: {
                    googleId,
                    profilePhoto: profilePhoto || user.profilePhoto,
                    updatedAt: new Date(),
                  },
                }
              );
              user.googleId = googleId;
              user.profilePhoto = profilePhoto || user.profilePhoto;
            }
          } else {
            // مستخدم جديد - إنشاء حساب
            const newUser = {
              email: email.toLowerCase(),
              name: displayName,
              googleId,
              profilePhoto,
              role: 'user', // الدور الافتراضي
              createdAt: new Date(),
              updatedAt: new Date(),
              isEmailVerified: true, // Google يتحقق من البريد الإلكتروني
            };

            const result = await usersCollection.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
          }

          // إرجاع المستخدم
          return done(null, user);
        } catch (error) {
          console.error('❌ Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id.toString());
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const db = getDb();
      const usersCollection = db.collection('users');
      const { ObjectId } = await import('mongodb');
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Google OAuth configured successfully');
  return true;
}

/**
 * إنشاء session token للمستخدم
 * @param {Object} user - كائن المستخدم
 * @returns {Promise<string>} - Session token
 */
export async function createSessionToken(user) {
  const db = getDb();
  const sessionsCollection = db.collection('sessions');
  const crypto = await import('crypto');

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await sessionsCollection.insertOne({
    userId: user._id,
    sessionToken,
    createdAt: new Date(),
    expiresAt,
  });

  return sessionToken;
}

/**
 * إعداد routes لـ Google OAuth
 * @param {Express.Application} app - Express app
 * @param {string} frontendURL - URL للواجهة الأمامية
 */
export function setupGoogleRoutes(app, frontendURL) {
  // Route للبدء في عملية المصادقة
  app.get('/api/v1/auth/google', passport.authenticate('google'));

  // Callback route بعد المصادقة
  app.get(
    '/api/v1/auth/google/callback',
    passport.authenticate('google', { 
      failureRedirect: `${frontendURL}/login?error=google_auth_failed`,
      session: false 
    }),
    async (req, res) => {
      try {
        // إنشاء session token
        const sessionToken = await createSessionToken(req.user);

        // إرسال المستخدم إلى الواجهة الأمامية مع التوكن
        res.redirect(`${frontendURL}/?token=${sessionToken}&from=google`);
      } catch (error) {
        console.error('❌ Error creating session after Google auth:', error);
        res.redirect(`${frontendURL}/login?error=session_creation_failed`);
      }
    }
  );
}
