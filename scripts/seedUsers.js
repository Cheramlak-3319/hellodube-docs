require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const demoUsers = [
  {
    firstName: "Dube",
    lastName: "Admin",
    email: "admin@dube.com",
    password: "password123",
    role: "dube-admin",
  },
  {
    firstName: "Dube",
    lastName: "Viewer",
    email: "viewer@dube.com",
    password: "password123",
    role: "dube-viewer",
  },
  {
    firstName: "WFP",
    lastName: "Admin",
    email: "wfpadmin@example.com",
    password: "password123",
    role: "wfp-admin",
  },
  {
    firstName: "WFP",
    lastName: "Viewer",
    email: "wfpviewer@example.com",
    password: "password123",
    role: "wfp-viewer",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({ email: { $in: demoUsers.map((u) => u.email) } });
  for (const u of demoUsers) {
    u.password = await bcrypt.hash(u.password, 10);
    await User.create(u);
    console.log(`✅ Created ${u.email} (${u.role})`);
  }
  console.log("🎉 Database seeded");
  process.exit(0);
}
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
