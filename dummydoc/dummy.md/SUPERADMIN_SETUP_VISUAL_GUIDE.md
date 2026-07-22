# Superadmin Setup Visual Guide
## Step-by-Step with Screenshots & Commands

---

## 🎯 **COMPLETE SETUP FLOW**

```
┌─────────────────────────────────────────────────────────────┐
│          SUPERADMIN SETUP - COMPLETE FLOW                   │
└─────────────────────────────────────────────────────────────┘

    STEP 1: Create Account (30 seconds)
    ├─ Run: npm run seed:superadmin
    └─ Get: Email & Password
            ↓
    STEP 2: Start Backend (2 seconds)
    ├─ Run: npm run dev
    └─ Wait for: "Server listening on port 3000"
            ↓
    STEP 3: Start Frontend (2 seconds)
    ├─ Run: cd client && npm run dev
    └─ Wait for: "Local: http://localhost:5173"
            ↓
    STEP 4: Login (30 seconds)
    ├─ Open: http://localhost:3000/login
    ├─ Email: superadmin@apponext.com
    ├─ Password: SuperAdmin@2026!Secure
    └─ Click: Sign In
            ↓
    STEP 5: Change Password (1 minute) ⚡ IMPORTANT!
    ├─ Go to: Settings → Change Password
    ├─ Current: SuperAdmin@2026!Secure
    ├─ New: Your strong password
    └─ Save: ✓
            ↓
    STEP 6: Enable MFA (2 minutes) 🔒 RECOMMENDED
    ├─ Go to: Settings → Security
    ├─ Enable: Two-Factor Authentication
    ├─ Scan: QR Code with authenticator app
    ├─ Enter: 6-digit verification code
    └─ Save: Backup codes ✓
            ↓
    ✅ YOU'RE READY TO USE YOUR ADMIN ACCOUNT!
```

---

## 📱 **STEP 1: CREATE SUPERADMIN ACCOUNT**

### **Command to Run**

```bash
# Navigate to ApponextHRMS directory
cd C:\Projects\ApponextHRMS

# Windows Users (Recommended)
.\setup-superadmin.ps1

# Mac/Linux Users
cd server
npm run seed:superadmin
```

### **Expected Output**

```
🚀 Creating superadmin user...

🔐 Hashing password with Argon2...
✅ Password hashed

📦 Creating platform organization...
✅ Organization created: ApponextHRMS Platform

👤 Creating superadmin user...
✅ Superadmin user created

✅ SuperAdmin role assigned

╔════════════════════════════════════════════════════════════╗
║           SUPERADMIN LOGIN CREDENTIALS                     ║
╚════════════════════════════════════════════════════════════╝

✅ SUPERADMIN ACCOUNT CREATED SUCCESSFULLY!

📧 Email:    superadmin@apponext.com
🔑 Password: SuperAdmin@2026!Secure
```

### **What Happens Behind the Scenes**

```
Database Operations:
├─ ✅ Check if user exists
├─ ✅ Hash password with Argon2
├─ ✅ Create platform organization
│   └─ Name: ApponextHRMS Platform
│   └─ Slug: apponext-platform
│   └─ Tier: Enterprise
├─ ✅ Create superadmin user
│   └─ Email: superadmin@apponext.com
│   └─ Password: [hashed]
│   └─ Role: SUPERADMIN
├─ ✅ Create SuperAdmin role
├─ ✅ Assign role to user
└─ ✅ Display credentials

Database Tables Updated:
├─ organizations (1 new row)
├─ users (1 new row)
├─ roles (1 new row)
└─ user_roles (1 new row)
```

---

## 🖥️ **STEP 2: START BACKEND SERVER**

### **Terminal 1: Backend**

```bash
# Navigate to server directory
cd C:\Projects\ApponextHRMS\server

# Start development server
npm run dev
```

### **Expected Output**

```
[11:45:23] Watching for changes...

✓ Database connected
✓ Routes registered
✓ Middleware loaded

🚀 Server listening on http://localhost:3000

Ready for requests...
```

### **What This Does**

```
Server Initialization:
├─ ✅ Connect to MySQL database
├─ ✅ Initialize Knex query builder
├─ ✅ Register all route handlers
│   ├─ Auth routes
│   ├─ Marketplace routes (NEW)
│   ├─ Licensing routes (NEW)
│   └─ Other modules
├─ ✅ Setup middleware
│   ├─ Authentication
│   ├─ CORS
│   ├─ Rate limiting
│   └─ License checks
└─ ✅ Listen on port 3000

Status: READY FOR CONNECTIONS
```

---

## 🎨 **STEP 3: START FRONTEND**

### **Terminal 2: Frontend (New Terminal)**

```bash
# Navigate to client directory
cd C:\Projects\ApponextHRMS\client

# Start development server
npm run dev
```

### **Expected Output**

```
VITE v5.0.0  ready in 285 ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

### **What This Does**

```
Frontend Initialization:
├─ ✅ Start Vite dev server
├─ ✅ Load React components
├─ ✅ Initialize routing
│   ├─ Login page
│   ├─ Dashboard
│   ├─ Marketplace
│   └─ Admin pages
├─ ✅ Setup React Query
├─ ✅ Setup Zustand state
└─ ✅ Listen on port 5173

Status: READY FOR BROWSER
```

---

## 🌐 **STEP 4: LOGIN TO ADMIN**

### **Open Browser**

Navigate to: **http://localhost:3000/login**

### **Login Page Appearance**

```
┌─────────────────────────────────────────┐
│                                         │
│    ApponextHRMS                        │
│    Platform Access                     │
│                                         │
│  Email Address                         │
│  ┌───────────────────────────────────┐ │
│  │ superadmin@apponext.com          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Password                              │
│  ┌───────────────────────────────────┐ │
│  │ ••••••••••••••••••••             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ☐ Remember me                         │
│                                         │
│         [Sign In →]                   │
│                                         │
│  Forgot Password?                      │
│                                         │
└─────────────────────────────────────────┘
```

### **Enter Credentials**

| Field | Value |
|-------|-------|
| Email | `superadmin@apponext.com` |
| Password | `SuperAdmin@2026!Secure` |

### **Click "Sign In"**

Expected result: Redirected to dashboard

---

## 📊 **STEP 5: ADMIN DASHBOARD**

### **After Successful Login**

```
┌──────────────────────────────────────────────────────────┐
│  ApponextHRMS Platform Dashboard                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  👤 Super Admin    🔔 5 notifications    ⚙️ Settings   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📊 DASHBOARD                                           │
│  ├─ Active Organizations: 1                            │
│  ├─ Active Users: 1                                    │
│  ├─ Active Subscriptions: 0                            │
│  └─ System Health: ✅ Healthy                          │
│                                                          │
│  🛍️  MARKETPLACE                                         │
│  ├─ Payroll Pro (Available)                            │
│  ├─ Recruitment Pro (Available)                        │
│  └─ AI Assistant (Available)                           │
│                                                          │
│  👥 ORGANIZATIONS                                       │
│  └─ ApponextHRMS Platform ★                            │
│                                                          │
│  💳 BILLING                                             │
│  ├─ Revenue: $0.00 MTD                                 │
│  ├─ Active Subscriptions: 0                            │
│  └─ Recent Invoices: 0                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### **Key Dashboard Elements**

```
You can now access:

1. MARKETPLACE
   ├─ View available addons
   ├─ Manage addon pricing
   └─ View subscriptions

2. ORGANIZATIONS
   ├─ View all organizations
   ├─ Create organizations
   └─ Manage organization settings

3. USERS
   ├─ View all users
   ├─ Create users
   ├─ Assign roles
   └─ Reset passwords

4. LICENSING
   ├─ Enable/disable features
   ├─ Set usage quotas
   └─ View audit logs

5. BILLING
   ├─ View invoices
   ├─ Track revenue
   └─ Manage subscriptions

6. SYSTEM
   ├─ Monitor health
   ├─ View logs
   └─ Manage settings
```

---

## 🔐 **STEP 6: CHANGE PASSWORD (CRITICAL!)**

### **Navigate to Settings**

1. Click profile icon (top right)
2. Click "Settings"
3. Click "Change Password"

### **Change Password Form**

```
┌────────────────────────────────────┐
│  Change Password                   │
├────────────────────────────────────┤
│                                    │
│  Current Password *                │
│  ┌──────────────────────────────┐  │
│  │ ••••••••••••••••••••        │  │
│  └──────────────────────────────┘  │
│                                    │
│  New Password *                    │
│  ┌──────────────────────────────┐  │
│  │ ••••••••••••••••••••        │  │
│  └──────────────────────────────┘  │
│  ℹ️  12+ characters recommended    │
│                                    │
│  Confirm New Password *            │
│  ┌──────────────────────────────┐  │
│  │ ••••••••••••••••••••        │  │
│  └──────────────────────────────┘  │
│                                    │
│        [Save Password] [Cancel]    │
│                                    │
└────────────────────────────────────┘
```

### **Actions**

1. **Current Password**: `SuperAdmin@2026!Secure`
2. **New Password**: Create strong password (e.g., `MySecure@Pass2026!`)
3. **Confirm**: Re-enter new password
4. **Click**: "Save Password"

### **Expected Result**

```
✅ Password changed successfully!

Your new password is now active.
Please save it in a secure location.
```

---

## 🔒 **STEP 7: ENABLE TWO-FACTOR AUTHENTICATION (OPTIONAL BUT RECOMMENDED)**

### **Navigate to Security**

1. Click "Settings"
2. Click "Security"
3. Click "Enable Two-Factor Authentication"

### **MFA Setup**

```
Step 1: Scan QR Code
┌────────────────────┐
│   QR CODE HERE     │
│   █████████████    │
│   ███       ███    │
│   ███ ■ ■ ■ ███    │
│   ███       ███    │
│   █████████████    │
└────────────────────┘

Scan with:
✅ Google Authenticator
✅ Microsoft Authenticator
✅ Authy
✅ FreeOTP

Step 2: Enter Code
Verification Code: [6 digits]

Step 3: Backup Codes
Copy and save these codes in a secure location:
XXXXXX-XXXXXX
XXXXXX-XXXXXX
XXXXXX-XXXXXX
```

### **After Setup**

```
✅ Two-Factor Authentication Enabled!

Your account is now protected with 2FA.
You'll need your authenticator app to login.

Backup codes saved: ✓
```

---

## ✅ **VERIFICATION CHECKLIST**

After completing all steps, verify:

```
Phase 1: Account Creation
  ☑️ Script ran without errors
  ☑️ Credentials displayed
  ☑️ Database updated

Phase 2: Server Setup
  ☑️ Backend started on port 3000
  ☑️ Frontend started on port 5173
  ☑️ No console errors

Phase 3: Login
  ☑️ Can access login page
  ☑️ Can login with credentials
  ☑️ Dashboard loads successfully

Phase 4: Account Security
  ☑️ Password changed to new one
  ☑️ Can still login with new password
  ☑️ 2FA enabled (optional)
  ☑️ Backup codes saved

Phase 5: Admin Access
  ☑️ Can see marketplace
  ☑️ Can see organizations
  ☑️ Can access settings
  ☑️ Can view admin dashboard
```

---

## 🎉 **YOU'RE DONE!**

Your superadmin account is now fully set up and secured!

```
┌─────────────────────────────────────────┐
│        🎉 SETUP COMPLETE 🎉            │
├─────────────────────────────────────────┤
│                                         │
│  ✅ Account Created                    │
│  ✅ Password Changed                   │
│  ✅ MFA Enabled                        │
│  ✅ Admin Access Ready                 │
│                                         │
│  Status: READY TO USE                  │
│                                         │
│  Next Steps:                            │
│  1. Explore the dashboard              │
│  2. Create test organization           │
│  3. Subscribe to test addon            │
│  4. Invite team members                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📞 **QUICK REFERENCE**

| Item | Value |
|------|-------|
| **Email** | superadmin@apponext.com |
| **Password** | [Your new password] |
| **Login URL** | http://localhost:3000/login |
| **Dashboard URL** | http://localhost:3000/dashboard |
| **Admin Portal** | http://localhost:3000/admin |
| **Marketplace** | http://localhost:3000/marketplace |

---

**Time to Complete**: ~5 minutes  
**Difficulty**: ⭐ (Very Easy)  
**Status**: ✅ Ready to Use  

