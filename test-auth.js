const axios = require("axios");
require("dotenv").config();

const BASE_URL = process.env.BASE_URL || "http://localhost:5555";

async function testAuthentication() {
  console.log("🚀 Starting Authentication Tests...\n");

  try {
    // Test 1: Public endpoint
    console.log("1. Testing public endpoint...");
    const publicRes = await axios.get(`${BASE_URL}/api/test/public`);
    console.log("✅ Public endpoint:", publicRes.data.message);

    // Test 2: Protected endpoint without token
    console.log("\n2. Testing protected endpoint without token...");
    try {
      await axios.get(`${BASE_URL}/api/test/auth`);
      console.log("❌ Should have failed without token!");
    } catch (error) {
      console.log(
        "✅ Correctly rejected without token:",
        error.response?.data?.message,
      );
    }

    // ✅ Test 3: Register a **single** new test user (unique email)
    console.log("\n3. Registering test user...");
    const testUser = {
      firstName: "WFP",
      lastName: "Viewer",
      email: "wfpviewer@example.com",
      password: "password123",
      role: "wfp-viewer",
    };

    let accessToken;
    try {
      const registerRes = await axios.post(
        `${BASE_URL}/api/auth/register`,
        testUser,
      );
      console.log("✅ Registration successful");
      accessToken = registerRes.data.tokens.accessToken;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log("⚠️ User already exists – proceeding to login...");
      } else {
        console.error(
          "❌ Registration failed:",
          error.response?.data || error.message,
        );
        throw error;
      }
    }

    // ✅ Test 4: Login with the test user
    console.log("\n4. Logging in...");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    console.log("✅ Login successful");
    accessToken = loginRes.data.tokens.accessToken;
    console.log("   Token received:", accessToken ? "Yes" : "No");

    // Test 5: Protected endpoint with token
    console.log("\n5. Testing protected endpoint WITH token...");
    const authRes = await axios.get(`${BASE_URL}/api/test/auth`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("✅ Protected endpoint accessed successfully");
    console.log("   User:", authRes.data.user);

    // Test 6: Dube endpoint
    console.log("\n6. Testing Dube endpoint...");
    try {
      const dubeRes = await axios.get(
        `${BASE_URL}/api/dube/international/getprojectlist.php?limit=5`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log("✅ Dube endpoint accessed");
      console.log("   Response status:", dubeRes.status);
    } catch (error) {
      console.log(
        "⚠️ Dube endpoint returned:",
        error.response?.status,
        error.response?.data?.message || error.message,
      );
    }

    // Test 7: Swagger UI redirect (optional)
    console.log("\n7. Testing Swagger UI access...");
    try {
      const swaggerRes = await axios.get(
        `${BASE_URL}/api-docs/dube/viewer?token=${accessToken}`,
        {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        },
      );
      console.log("✅ Swagger UI accessible, status:", swaggerRes.status);
    } catch (error) {
      console.log(
        "⚠️ Swagger UI test (non‑critical):",
        error.response?.status || error.message,
      );
    }

    console.log("\n🎉 All critical tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
    process.exit(1);
  }
}

testAuthentication();
