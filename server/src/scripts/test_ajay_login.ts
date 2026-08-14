import { AuthService } from '../modules/auth/auth.service';

async function testLogin() {
  const service = new AuthService();
  console.log("Testing login for 'ajay@gmail.com' with password 'password123'...");

  try {
    const result = await service.login('ajay@gmail.com', 'password123');
    console.log("🎉 LOGIN SUCCESSFUL!");
    console.log("User:", result.user);
    console.log("Organization:", result.organization);
    console.log("Roles:", result.roles);
  } catch (err: any) {
    console.error("❌ LOGIN FAILED:", err.message);
  }

  process.exit(0);
}

testLogin();
