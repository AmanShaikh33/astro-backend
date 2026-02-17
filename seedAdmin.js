import User from "./models/User.js";
import bcrypt from "bcryptjs";
import { connectDb } from "./database/db.js";
import dotenv from "dotenv";

dotenv.config();

const createAdminUser = async () => {
  try {
    await connectDb();
    
    
    const adminExists = await User.findOne({ email: "Admin@astrotalk.com" });
    if (adminExists) {
      console.log("Admin user already exists");
      return;
    }

  
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    const admin = await User.create({
      name: "Admin",
      email: "Admin@astrotalk.com",
      password: hashedPassword,
      role: "admin",
      coins: 0
    });

    console.log("Admin user created successfully:", admin.email);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

createAdminUser();