# SuperAdmin Credentials
## ApponextHRMS Platform Access

**Created**: 2026-07-19  
**Status**: ✅ READY TO CREATE  

---

## 🚀 **CREATE SUPERADMIN ACCOUNT**

### **Method 1: Automated (Recommended)**

Run this single command:

```bash
cd /path/to/ApponextHRMS/server
npm run seed:superadmin
```

**What it does:**
- ✅ Creates superadmin user
- ✅ Hashes password with Argon2
- ✅ Creates platform organization
- ✅ Assigns superadmin role
- ✅ Displays credentials on screen

**Expected output:**
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
...
```

---

## 📧 **DEFAULT CREDENTIALS**

### **If using automated script:**

```
Email:    superadmin@apponext.com
Password: SuperAdmin@2026!Secure
```

---

## 🔐 **FIRST TIME SETUP**

### **Step 1: Login**

```
URL: http://localhost:3000/login
Email: superadmin@apponext.com
Password: SuperAdmin@2026!Secure
```

### **Step 2: Change Password (IMPORTANT!)**

1. Click profile icon (top right)
2. Click "Settings"
3. Click "Change Password"
4. Enter old password: `SuperAdmin@2026!Secure`
5. Enter new strong password
6. Confirm new password
7. Click "Save"

### **Step 3: Setup MFA (Multi-Factor Authentication)**

1. Go to Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter verification code
5. Save backup codes in secure location

---

## 🏢 **PLATFORM ORGANIZATION**

### **Details**

```
Organization Name: ApponextHRMS Platform
Slug: apponext-platform
Tier: Enterprise
Status: Active
User Count: 1 (superadmin)
```

### **Access**

As superadmin, you have access to:
- ✅ All organizations
- ✅ All users
- ✅ All modules
- ✅ Marketplace settings
- ✅ Licensing configuration
- ✅ Billing & invoicing
- ✅ Audit logs
- ✅ System settings

---

## 🎯 **SUPERADMIN PERMISSIONS**

The superadmin account has **full platform access**:

```
✅ Platform Administration
├── View all organizations
├── Manage organizations
├── Create organizations
├── Delete organizations
└── View organization health

✅ User Management
├── Create users
├── Edit users
├── Delete users
├── Reset passwords
├── Assign roles
└── View user activity

✅ Marketplace Management
├── Create addons
├── Edit addon details
├── Set addon pricing
├── Enable/disable addons
└── View addon subscriptions

✅ Licensing Control
├── Override feature licenses
├── Enable/disable features
├── Set usage quotas
└── View license audit logs

✅ Billing & Finance
├── View all invoices
├── Manage payment methods
├── Process refunds
├── View revenue reports
└── Configure billing settings

✅ System Administration
├── View system health
├── Manage system settings
├── Configure email/SMS
├── View error logs
├── Configure integrations
└── Manage API keys

✅ Audit & Compliance
├── View all audit logs
├── Export audit trails
├── View access logs
├── View API logs
└── Compliance reports
```

---

## 🔒 **SECURITY BEST PRACTICES**

### **DO:**
✅ Change password immediately after creation  
✅ Enable two-factor authentication  
✅ Use a strong, unique password (12+ characters)  
✅ Store credentials in password manager  
✅ Review audit logs regularly  
✅ Use HTTPS in production  
✅ Keep browser/OS updated  

### **DON'T:**
❌ Share credentials with others  
❌ Use default password in production  
❌ Store password in plain text  
❌ Use same password as other accounts  
❌ Login from untrusted networks  
❌ Leave browser unattended after login  
❌ Use simple/predictable passwords  

---

## 📊 **LOGIN LOCATIONS**

### **Development**
```
URL:      http://localhost:3000/login
Backend:  http://localhost:3000
Frontend: http://localhost:5173
```

### **Staging**
```
URL: https://staging.apponext.com/login
```

### **Production**
```
URL: https://app.apponext.com/login
```

---

## 🆘 **TROUBLESHOOTING**

### **"User already exists" Error**

The superadmin account has already been created. Try logging in with:
```
Email: superadmin@apponext.com
Password: SuperAdmin@2026!Secure
```

### **"Invalid credentials" Error**

1. Verify email is correct: `superadmin@apponext.com`
2. Verify password is exactly: `SuperAdmin@2026!Secure`
3. Check caps lock is OFF
4. Verify database connection is working

### **"Database connection failed" Error**

1. Check MySQL is running
2. Verify .env has correct DB credentials
3. Check database exists
4. Run migrations: `npm run migrate`

### **"Table doesn't exist" Error**

Run database migrations first:
```bash
npm run migrate
```

Then create superadmin:
```bash
npm run seed:superadmin
```

---

## 📝 **ACCOUNT INFORMATION TO SAVE**

Save this information in a secure location:

```
═══════════════════════════════════════════════════════════
SUPERADMIN ACCOUNT DETAILS
═══════════════════════════════════════════════════════════

Email:          superadmin@apponext.com
Password:       [CHANGE THIS IMMEDIATELY]
User ID:        [Will be shown after creation]
Organization:   ApponextHRMS Platform
Login URL:      http://localhost:3000/login
API Base URL:   http://localhost:3000/api/v1

MFA:            [Enable after first login]
MFA Backup Code: [Save after setup]
Created Date:   2026-07-19
Last Changed:   [After first change]

═══════════════════════════════════════════════════════════
```

---

## ✅ **VERIFICATION CHECKLIST**

After creating the superadmin account:

- [ ] Run seed command: `npm run seed:superadmin`
- [ ] Backend server is running: `npm run dev`
- [ ] Frontend is running: `cd client && npm run dev`
- [ ] Can access login page: `http://localhost:3000/login`
- [ ] Can login with email & password
- [ ] Can view superadmin dashboard
- [ ] Can view all organizations
- [ ] Can view marketplace
- [ ] Can view licensing controls
- [ ] Can change password
- [ ] Can enable MFA
- [ ] Can view audit logs

---

## 🎓 **NEXT STEPS**

1. ✅ Create superadmin account (run seed command)
2. ✅ Change password immediately
3. ✅ Enable two-factor authentication
4. ✅ Review all system settings
5. ✅ Create first organization
6. ✅ Invite team members
7. ✅ Configure marketplace addons
8. ✅ Set up billing

---

## 📞 **SUPPORT**

If you need help:

1. Check troubleshooting section above
2. Review logs: `npm run dev` (check console)
3. Check database: `mysql -u user -p database`
4. Verify environment variables: `.env` file

---

**Status**: ✅ READY TO CREATE  
**Command**: `npm run seed:superadmin`  
**Time to Create**: < 5 seconds  

