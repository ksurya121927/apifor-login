import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FRONTEND_ORIGIN
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

app.use(
  cors({
    origin: FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST"]
  })
);

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CEZOO backend is running"
  });
});

app.post("/api/delivery-partner", async (req, res) => {
  try {
    const name =
      typeof req.body?.name === "string"
        ? req.body.name.trim().replace(/\s+/g, " ")
        : "";

    let mobile =
      typeof req.body?.mobile === "string"
        ? req.body.mobile.trim().replace(/[\s()-]/g, "")
        : "";

    // Accept +91 followed by a 10-digit mobile number.
    if (/^\+91[6-9]\d{9}$/.test(mobile)) {
      mobile = mobile.slice(3);
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please enter a name between 2 and 100 characters."
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number."
      });
    }

    const { error } = await supabase
      .from("delivery_partner_applications")
      .insert({ name, mobile });

    if (error) {
      console.error("Application insert failed:", error.code);

      return res.status(500).json({
        success: false,
        message: "Unable to submit. Please try again."
      });
    }

    return res.status(201).json({
      success: true,
      message: "Your application was submitted successfully."
    });
  } catch (error) {
    console.error("Application request failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request."
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request is too large."
    });
  }

  console.error("Request failed:", error.message);

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again."
  });
});

app.listen(PORT, () => {
  console.log(`CEZOO backend running on port ${PORT}`);
});
