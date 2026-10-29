const User = require('../models/User');
const { encrypt } = require('../utils/cryptoHelper');
const generateToken = require('../utils/generateToken');
const { OAuth2Client } = require('google-auth-library');
const { publicServerError } = require('../utils/publicError');
const { getNotificationService } = require('../services/notificationService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Standard user payload formatter
 */
const formatUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  phoneVerified: Boolean(user.phoneVerified),
  role: user.role,
  fpoName: user.fpoName,
  fpoRegistrationNo: user.fpoRegistrationNo,
  address: user.address,
  kycVerified: user.kycVerified,
  kycStatus: user.kycStatus,
  kycRejectionReason: user.kycRejectionReason,
  status: user.status,
  dob: user.dob,
  age: user.age,
  createdAt: user.createdAt,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, age, phone, role, fpoName, fpoRegistrationNo, address } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Full name is required',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email address is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address format',
      });
    }

    if (!password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Passwords do not match',
      });
    }

    // 2. Validate mobile number (mandatory for farmers)
    let normalizedPhone = undefined;
    if (phone) {
      let cleanedPhone = String(phone).replace(/[\s\-\(\)\+]/g, '');
      if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
        cleanedPhone = cleanedPhone.slice(2);
      } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
        cleanedPhone = cleanedPhone.slice(1);
      }

      if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please enter a valid 10-digit Indian mobile number',
        });
      }
      normalizedPhone = cleanedPhone;
    } else if (role !== 'FPO_ADMIN') {
      return res.status(400).json({
        status: 'fail',
        message: 'Mobile number is required',
      });
    }

    // 3. Validate Age (mandatory for farmers)
    let parsedAge = undefined;
    if (age !== undefined && age !== null && age !== '') {
      parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 120) {
        return res.status(400).json({
          status: 'fail',
          message: 'Age must be a valid integer between 18 and 120',
        });
      }
    } else if (role !== 'FPO_ADMIN') {
      return res.status(400).json({
        status: 'fail',
        message: 'Age is required and must be between 18 and 120',
      });
    }

    // 4. Duplicate checks
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({
        status: 'fail',
        message: 'An account with this email already exists',
      });
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({
          status: 'fail',
          message: 'An account with this mobile number already exists',
        });
      }
    }

    // 5. Role handling: strictly enforce role = FARMER for public registration
    let userRole = 'FARMER';
    if (role === 'FPO_ADMIN') {
      const adminSecret = req.body.adminSecretKey || req.headers['x-admin-secret-key'];
      const configuredSecret = process.env.ADMIN_SECRET_KEY;

      if (!configuredSecret || adminSecret !== configuredSecret) {
        return res.status(403).json({
          status: 'fail',
          message: 'Invalid or missing Admin Secret Key. Registration as FPO Admin is restricted.',
        });
      }
      userRole = 'FPO_ADMIN';
    }

    // 6. Create User record
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: userRole,
      phone: normalizedPhone,
      phoneVerified: false,
      age: parsedAge,
      fpoName: fpoName?.trim(),
      fpoRegistrationNo: fpoRegistrationNo?.trim(),
      address,
      status: 'ACTIVE',
      kycVerified: false,
      kycStatus: 'PENDING',
    });

    // 7. Non-blocking notification
    try {
      const notificationService = getNotificationService();
      if (notificationService && typeof notificationService.notifyUserRegistered === 'function') {
        await notificationService.notifyUserRegistered(user);
      }
    } catch (notifErr) {
      console.warn('Notification service error on registration:', notifErr.message);
    }

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      status: 'success',
      token,
      data: {
        user: formatUserPayload(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: publicServerError(error, 'Server error during registration'),
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user by normalized email or case-insensitive regex
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    // If user account was created via Google Sign-In and has no local password yet
    if (!user.password && user.googleId) {
      if (password && password.length >= 6) {
        // Automatically link/set this password to their account so both Google and password logins work
        user.password = password;
        await user.save();
      } else {
        return res.status(401).json({
          status: 'fail',
          message: 'This account was created with Google Sign-In. Please sign in with Google or enter a password of at least 6 characters.',
        });
      }
    } else {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid email or password',
        });
      }
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        status: 'fail',
        message: 'Account is inactive or suspended',
      });
    }

    const token = generateToken(user._id, user.role);

    if (user.role === 'FARMER') {
      try {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await getNotificationService().notify({
          userId: user._id,
          type: 'USER_SIGN_IN',
          title: 'Successful Sign-In',
          body: `You successfully signed in to FarmSphere on ${new Date().toLocaleString('en-IN')}.`,
          entityType: 'User',
          entityId: user._id,
          metadata: {
            loginTime: new Date(),
            ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : ipAddress,
            userAgent,
          },
        });
      } catch (notifyErr) {
        console.error('[notify] USER_SIGN_IN login error:', notifyErr.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      token,
      data: {
        user: formatUserPayload(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: publicServerError(error, 'Server error during login'),
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        user: formatUserPayload(req.user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: publicServerError(error, 'Server error fetching user profile'),
    });
  }
};

// @desc    Update farmer profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, dob, age, address, aadhaar } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();

    if (dob) {
      const parsedDob = new Date(dob);
      if (isNaN(parsedDob.getTime())) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid date of birth format',
        });
      }
      updates.dob = parsedDob;

      const today = new Date();
      let calculatedAge = today.getFullYear() - parsedDob.getFullYear();
      const m = today.getMonth() - parsedDob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedDob.getDate())) {
        calculatedAge--;
      }
      updates.age = calculatedAge;
    } else if (age) {
      updates.age = Number(age);
    }

    if (address) {
      updates.address = {
        street: address.street?.trim() || req.user.address?.street,
        village: address.village?.trim() || req.user.address?.village,
        district: address.district?.trim() || req.user.address?.district,
        state: address.state?.trim() || req.user.address?.state,
        pincode: address.pincode?.trim() || req.user.address?.pincode,
      };
    }

    if (aadhaar) {
      const cleaned = aadhaar.replace(/\s+/g, '');
      if (/^\d{12}$/.test(cleaned)) {
        updates.aadhaar = encrypt(cleaned);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.status(200).json({
      status: 'success',
      message: 'Profile details updated successfully',
      data: { user: formatUserPayload(updatedUser) },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: publicServerError(error, 'Server error updating profile'),
    });
  }
};

// @desc    Authenticate with Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const credential = req.body.credential || req.body.token || req.body.idToken;

    if (!credential) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google credential token is required',
      });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid or expired Google credential token',
      });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Unable to retrieve email from Google token',
      });
    }

    const { email, name, sub: googleId } = payload;
    const normalizedEmail = String(email).trim().toLowerCase();

    let user = await User.findOne({
      $or: [
        { googleId },
        { email: normalizedEmail },
        { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
    });

    if (user && !user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        googleId,
        role: 'FARMER',
        status: 'ACTIVE',
        phoneVerified: false,
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        status: 'fail',
        message: 'Account is inactive or suspended',
      });
    }

    const token = generateToken(user._id, user.role);

    if (user.role === 'FARMER') {
      try {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await getNotificationService().notify({
          userId: user._id,
          type: 'USER_SIGN_IN',
          title: 'Successful Sign-In',
          body: `You successfully signed in to FarmSphere with Google on ${new Date().toLocaleString('en-IN')}.`,
          entityType: 'User',
          entityId: user._id,
          metadata: {
            loginTime: new Date(),
            ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : ipAddress,
            userAgent,
          },
        });
      } catch (notifyErr) {
        console.error('[notify] Google USER_SIGN_IN login error:', notifyErr.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      token,
      data: {
        user: formatUserPayload(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: publicServerError(error, 'Server error during Google authentication'),
    });
  }
};

module.exports = {
  formatUserPayload,
  register,
  login,
  getMe,
  updateProfile,
  googleAuth,
};
