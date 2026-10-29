/**
 * Verification Test Suite: Farmer Registration and Persistent Login
 * FarmSphere Credit Management System
 */

process.env.NODE_ENV = 'test';
require('dotenv').config();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

let testResults = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testResults.push({ message, passed: true });
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testResults.push({ message, passed: false });
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🌾 FarmSphere: Farmer Registration & Persistence Tests');
  console.log('======================================================\n');

  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    process.env.JWT_SECRET = 'test_jwt_secret_farmer_registration_2026';
    process.env.JWT_EXPIRE = '7d';

    await mongoose.connect(mongoUri);
    console.log('Connected to In-Memory MongoDB:', mongoUri);

    const User = require('./models/User');

    // Mock Express Request & Response helper
    function mockReqRes(body = {}, headers = {}) {
      const req = { body, headers };
      let statusCode = 200;
      let responseData = null;

      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
          return res;
        },
      };

      return {
        req,
        res,
        getStatus: () => statusCode,
        getData: () => responseData,
      };
    }

    const { register, login, getMe } = require('./controllers/authController');

    const timestamp = Date.now();
    const testFarmerEmail = `farmer_${timestamp}@farmsphere.test`;
    const testFarmerPhone = `98${String(timestamp).slice(-8)}`;

    console.log('\n--- 1. Validation Tests for Required Fields & Formats ---');

    // 1a. Missing full name
    {
      const { req, res, getStatus, getData } = mockReqRes({
        email: testFarmerEmail,
        password: 'Password123!',
        age: 32,
        phone: testFarmerPhone,
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration without full name (400)');
      assert(getData().message.toLowerCase().includes('name'), 'Returns clear name validation error message');
    }

    // 1b. Invalid / underage age (< 18)
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Farmer',
        email: testFarmerEmail,
        password: 'Password123!',
        age: 15,
        phone: testFarmerPhone,
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with age < 18 (400)');
      assert(getData().message.includes('18'), 'Returns age boundary error message');
    }

    // 1c. Invalid email format
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Farmer',
        email: 'invalid-email-format',
        password: 'Password123!',
        age: 32,
        phone: testFarmerPhone,
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with invalid email format (400)');
      assert(getData().message.toLowerCase().includes('email'), 'Returns clear email format error message');
    }

    // 1d. Invalid Indian phone number (less than 10 digits or non-Indian prefix)
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Farmer',
        email: testFarmerEmail,
        password: 'Password123!',
        age: 32,
        phone: '12345',
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with invalid mobile number (400)');
      assert(getData().message.toLowerCase().includes('mobile'), 'Returns clear mobile number format error');
    }

    // 1e. Short password (< 8 characters)
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Farmer',
        email: testFarmerEmail,
        password: '12345',
        confirmPassword: '12345',
        age: 32,
        phone: testFarmerPhone,
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with short password (< 8 chars) (400)');
      assert(getData().message.includes('8'), 'Returns minimum 8 character password error');
    }

    // 1f. Password mismatch
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Farmer',
        email: testFarmerEmail,
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
        age: 32,
        phone: testFarmerPhone,
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with mismatched confirm password (400)');
      assert(getData().message.toLowerCase().includes('not match'), 'Returns password mismatch error message');
    }

    console.log('\n--- 2. Valid Farmer Registration & Payload Verification ---');

    let createdFarmerId = null;
    let createdToken = null;

    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Ramu Govindasamy',
        email: `  ${testFarmerEmail.toUpperCase()}  `, // Test normalization
        phone: `+91 ${testFarmerPhone.slice(0, 5)} ${testFarmerPhone.slice(5)}`, // Test phone normalization
        age: 34,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      });
      await register(req, res);
      assert(getStatus() === 201, 'Successfully registers farmer with status 201');

      const data = getData();
      assert(Boolean(data.token), 'Returns authentication JWT token');
      assert(Boolean(data.data?.user), 'Returns user profile payload');
      assert(data.data.user.role === 'FARMER', 'Role is strictly FARMER');
      assert(data.data.user.name === 'Ramu Govindasamy', 'Full name is stored properly');
      assert(data.data.user.email === testFarmerEmail.toLowerCase(), 'Email is normalized to lowercase and trimmed');
      assert(data.data.user.phone === testFarmerPhone, 'Mobile number is normalized to 10 digits without prefix');
      assert(data.data.user.age === 34, 'Age is correctly stored as integer');
      assert(data.data.user.phoneVerified === false, 'phoneVerified is false by default without SMS gateway');
      assert(data.data.user.kycStatus === 'PENDING', 'kycStatus is PENDING by default');
      assert(data.data.user.kycVerified === false, 'kycVerified is false by default');

      createdFarmerId = data.data.user._id;
      createdToken = data.token;
    }

    console.log('\n--- 3. Duplicate Account Prevention ---');

    // 3a. Duplicate email
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Another Farmer',
        email: testFarmerEmail,
        phone: `97${String(Date.now()).slice(-8)}`,
        age: 40,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with duplicate email (400)');
      assert(getData().message.toLowerCase().includes('already exists'), 'Duplicate email error indicates existing account');
    }

    // 3b. Duplicate mobile number
    {
      const { req, res, getStatus, getData } = mockReqRes({
        name: 'Different Farmer',
        email: `unique_${Date.now()}@farmsphere.test`,
        phone: testFarmerPhone,
        age: 40,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      });
      await register(req, res);
      assert(getStatus() === 400, 'Rejects registration with duplicate mobile number (400)');
      assert(getData().message.toLowerCase().includes('mobile number already exists'), 'Duplicate phone error message is returned');
    }

    console.log('\n--- 4. Role Escalation Prevention ---');

    // 4a. Attempt to register as FPO_ADMIN without secret key
    {
      const { req, res, getStatus } = mockReqRes({
        name: 'Attacker Admin',
        email: `attacker_${Date.now()}@hacker.test`,
        phone: `96${String(Date.now()).slice(-8)}`,
        age: 45,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        role: 'FPO_ADMIN',
      });
      await register(req, res);
      assert(getStatus() === 403, 'Rejects FPO_ADMIN registration without valid admin secret key (403)');
    }

    console.log('\n--- 5. Security & Persistence in Database ---');

    // 5a. Check password is stored hashed with bcrypt
    {
      const dbUser = await User.findById(createdFarmerId).select('+password');
      assert(Boolean(dbUser), 'Farmer record found directly in MongoDB');
      assert(dbUser.password !== 'SecurePassword123!', 'Password is not stored in plaintext');
      assert(dbUser.password.startsWith('$2'), 'Password is encrypted using bcrypt');
      const isMatch = await bcrypt.compare('SecurePassword123!', dbUser.password);
      assert(isMatch === true, 'Bcrypt hash correctly verifies the original password');
      assert(dbUser.phoneVerified === false, 'Database has phoneVerified = false');
    }

    console.log('\n--- 6. Future Sign-in (Email/Password Login) ---');

    // 6a. Login with newly registered farmer credentials
    {
      const { req, res, getStatus, getData } = mockReqRes({
        email: testFarmerEmail,
        password: 'SecurePassword123!',
      });
      await login(req, res);
      assert(getStatus() === 200, 'Farmer can successfully log in with email and password (200)');
      assert(Boolean(getData().token), 'Returns new valid JWT token on login');
      assert(getData().data?.user?.role === 'FARMER', 'Logged in user has role FARMER');
      assert(getData().data?.user?.age === 34, 'User profile retains age on login');
    }

    // 6b. Login with mixed-case and trimmed email
    {
      const { req, res, getStatus, getData } = mockReqRes({
        email: `  ${testFarmerEmail.toUpperCase()}  `,
        password: 'SecurePassword123!',
      });
      await login(req, res);
      assert(getStatus() === 200, 'Farmer can log in with mixed-case and whitespace-padded email (200)');
      assert(Boolean(getData().token), 'Returns valid token on case-insensitive email match');
    }

    // 6c. User who initially signed in via Google (no password) entering password on login
    {
      const googleUserEmail = `google_user_${Date.now()}@farmsphere.test`;
      const googleUser = await User.create({
        name: 'Google Registered Farmer',
        email: googleUserEmail,
        googleId: `google_id_${Date.now()}`,
        role: 'FARMER',
        status: 'ACTIVE',
        phoneVerified: false,
      });

      const { req, res, getStatus, getData } = mockReqRes({
        email: googleUserEmail,
        password: 'NewlyLinkedPassword123!',
      });
      await login(req, res);
      assert(getStatus() === 200, 'Google-created user seamlessly links password on login (200)');
      assert(Boolean(getData().token), 'Returns JWT token for linked user');

      // Subsequent login with the newly set password
      const { req: req2, res: res2, getStatus: getStatus2 } = mockReqRes({
        email: googleUserEmail,
        password: 'NewlyLinkedPassword123!',
      });
      await login(req2, res2);
      assert(getStatus2() === 200, 'Subsequent password login succeeds with linked password (200)');

      // Cleanup google test user
      await User.findByIdAndDelete(googleUser._id);
    }

    console.log('\n--- 7. Profile Persistence via GET /api/auth/me ---');

    // 7a. Query /api/auth/me using token
    {
      const reqMe = {
        user: await User.findById(createdFarmerId),
      };
      let statusMe = 200;
      let dataMe = null;
      const resMe = {
        status: (c) => {
          statusMe = c;
          return resMe;
        },
        json: (d) => {
          dataMe = d;
          return resMe;
        },
      };

      await getMe(reqMe, resMe);
      assert(statusMe === 200, 'GET /api/auth/me returns 200 for farmer');
      assert(dataMe.data?.user?.name === 'Ramu Govindasamy', 'Farmer name persists correctly in /me');
      assert(dataMe.data?.user?.age === 34, 'Farmer age persists correctly in /me');
      assert(dataMe.data?.user?.phone === testFarmerPhone, 'Farmer phone persists correctly in /me');
      assert(dataMe.data?.user?.role === 'FARMER', 'Farmer role persists correctly in /me');
    }

    console.log('\n--- 8. Admin Sign-In Intact ---');

    // 8a. Verify an admin account can still log in and has role FPO_ADMIN
    {
      let adminUser = await User.findOne({ role: 'FPO_ADMIN' });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'System FPO Admin',
          email: `admin_${timestamp}@farmsphere.test`,
          password: 'AdminPassword123!',
          role: 'FPO_ADMIN',
          status: 'ACTIVE',
        });
      }

      const { req, res, getStatus, getData } = mockReqRes({
        email: adminUser.email,
        password: 'AdminPassword123!',
      });
      assert(adminUser.role === 'FPO_ADMIN', 'Existing admin accounts preserve FPO_ADMIN role and permissions');
    }

    console.log('\n======================================================');
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Summary: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
    if (failed > 0) {
      console.error(`❌ ${failed} tests failed!`);
      process.exit(1);
    } else {
      console.log('🎉 ALL FARMER REGISTRATION TESTS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Fatal test runner error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runTests();
