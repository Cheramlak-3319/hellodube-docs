// ---------- MONGODB CONNECTION (cached for serverless) ----------
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI)
      .then((mongoose) => {
        console.log("✅ MongoDB connected");
        return mongoose;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware to ensure DB is connected before any request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection middleware error:", err);
    res
      .status(500)
      .json({ error: true, message: "Database connection failed" });
  }
});

// Remove the old mongoose.connect line – it's replaced by the above.
