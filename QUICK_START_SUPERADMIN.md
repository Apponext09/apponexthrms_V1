# Quick Start: Superadmin Setup
## Get Your ApponextHRMS Admin Account Running in 5 Minutes

---

## ⚡ **FASTEST WAY (30 Seconds)**

### **Windows (PowerShell)**
```powershell
cd C:\Projects\ApponextHRMS
.\setup-superadmin.ps1
```

### **Mac/Linux (Bash)**
```bash
cd /path/to/ApponextHRMS
cd server
npm run seed:superadmin
```

**Done!** Credentials will be displayed on screen.

---

## 📝 **STEP-BY-STEP SETUP**

### **Step 1: Navigate to Server Directory**
```bash
cd C:\Projects\ApponextHRMS\server
# or
cd /path/to/ApponextHRMS/server
```

### **Step 2: Create Superadmin**
```bash
npm run seed:superadmin
```

### **Step 3: Wait for Success Message**

You should see:
```
🚀 Creating superadmin user...
🔐 Hashing password with Argon2...
✅ Password hashed
📦 Creating platform organization...
✅ Organization created
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

---

## 🔑 **YOUR CREDENTIALS**

```
Email:    superadmin@apponext.com
Password: SuperAdmin@2026!Secure
```

**⚠️ Save these somewhere secure. You'll need them to login.**

---

## 🚀 **START THE APPLICATION**

### **Terminal 1: Start Backend**
```bash
cd /path/to/ApponextHRMS/server
npm run dev
```

**Expected output:**
```
Server listening on port 3000
Database connected ✓
Routes registered ✓
```

### **Terminal 2: Start Frontend**
```bash
cd /path/to/ApponextHRMS/client
npm run dev
```

**Expected output:**
```
Local: http://localhost:5173
```

---

## 🌐 **LOGIN TO ADMIN**

1. **Open Browser**: http://localhost:3000/login

2. **Enter Credentials**:
   - Email: `superadmin@apponext.com`
   - Password: `SuperAdmin@2026!Secure`

3. **Click "Sign In"**

4. **You're now logged in!** 🎉

---

## ✅ **WHAT YOU CAN DO NOW**

As superadmin, you can:

- ✅ View all organizations
- ✅ Manage marketplace addons
- ✅ Control feature licensing
- ✅ View billing & invoices
- ✅ Manage users & roles
- ✅ View system health
- ✅ Access all HRMS modules
- ✅ Run reports

---

## 🔐 **FIRST TIME ACTIONS (IMPORTANT)**

### **1. Change Your Password** ⚡ DO THIS FIRST!

1. Click profile icon (top right)
2. Click "Settings" 
3. Click "Change Password"
4. Current: `SuperAdmin@2026!Secure`
5. New: Choose a strong password (12+ chars, mix of upper/lower/numbers/symbols)
6. Click "Save"

### **2. Enable Two-Factor Authentication** 🔒

1. Go to Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with Google Authenticator / Authy / Microsoft Authenticator
4. Enter the 6-digit code
5. Save backup codes in a secure place

---

## 📊 **WHAT TO DO NEXT**

After logging in, explore:

**1. Dashboard**
```
View: System health, active users, recent activity
```

**2. Marketplace**
```
View: Available addons (Payroll Pro, Recruitment Pro, AI Assistant)
Manage: Addon pricing, features, availability
```

**3. Organizations**
```
View: All organizations
Manage: Create new orgs, assign subscriptions
```

**4. Users**
```
View: All users across all orgs
Manage: Create users, assign roles, reset passwords
```

**5. Licensing**
```
View: Module licensing for each org
Manage: Enable/disable features, set usage quotas
```

**6. Billing**
```
View: Invoices, subscriptions, revenue
Manage: Payment methods, refunds, discounts
```

---

## 🆘 **TROUBLESHOOTING**

### **"User already exists"**
→ Superadmin already created. Login with provided credentials.

### **"Database connection failed"**
→ Make sure MySQL is running and `.env` has correct DB settings.

### **"Cannot find module"**
→ Run `npm install` in the server directory.

### **"Command not found: npm"**
→ Install Node.js from https://nodejs.org/

### **"Port 3000 already in use"**
→ Kill process: `lsof -ti:3000 | xargs kill -9` (Mac/Linux)

---

## 📱 **ACCESSING VIA SMARTPHONE**

If backend is running on a different machine:

1. Find the machine's IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
2. Visit: `http://[IP_ADDRESS]:3000/login`

Example: `http://192.168.1.100:3000/login`

---

## 🎓 **ADMIN FEATURES**

### **Marketplace Management**
- Browse available addons
- View subscription status
- Configure pricing
- Enable/disable addons

### **Organization Management**
- Create new organizations
- Assign subscription plans
- View organization health
- Manage users per org

### **Module Licensing**
- Enable/disable features per organization
- Set usage quotas
- View license audit logs
- Override licenses if needed

### **User Management**
- Create users
- Assign roles
- Reset passwords
- View login history

### **Billing & Finance**
- View invoices
- Manage subscriptions
- Track revenue
- Process refunds

### **System Monitoring**
- View system health
- Check API performance
- Monitor database status
- View error logs

---

## 📚 **DOCUMENTATION**

Need more details? Check these files:

- `SUPERADMIN_CREDENTIALS.md` - Detailed credential info
- `PHASE1_IMPLEMENTATION_GUIDE.md` - Technical setup guide
- `PHASE1_QUICK_REFERENCE.md` - API reference
- `ENTERPRISE_PLATFORM_MASTER_ROADMAP.md` - Feature overview

---

## ✨ **YOU'RE ALL SET!**

🎉 Your superadmin account is ready to use!

**Login**: superadmin@apponext.com  
**Password**: SuperAdmin@2026!Secure  

**Remember to change your password after first login!**

---

**Time to setup**: ~5 minutes  
**Status**: ✅ Ready to use  
**Support**: Check troubleshooting above  

