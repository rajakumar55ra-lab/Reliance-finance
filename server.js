"use strict";

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50kb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Demo API is running."
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    server: "running",
    supabaseConfigured: Boolean(supabase)
  });
});

// Submit a demo application
app.post("/submit-application", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: "Supabase is not configured."
      });
    }

    const {
      name,
      mobile,
      loanType,
      loanAmount,
      returnYear,
      percentage,
      aadhaarLast4,
      panLast4,
      charge,
      chargeAmount,
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiNumber
    } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanMobile = String(mobile || "").trim();
    const amount = Number(loanAmount);
    const rate = Number(percentage ?? 0);

    if (!cleanName || !/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a name and a valid 10-digit demo mobile number."
      });
    }

    if (
      !String(loanType || "").trim() ||
      loanAmount === undefined ||
      loanAmount === null ||
      loanAmount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Check the loan type, amount and percentage."
      });
    }

    const optionalNumber = (value) => {
      if (value === undefined || value === null || value === "") {
        return 0;
      }
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const chargeValue = optionalNumber(charge);
    const chargeAmountValue = optionalNumber(chargeAmount);

    if (chargeValue === null || chargeAmountValue === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid demo charge value."
      });
    }

    const { data, error } = await supabase
      .from("applications")
      .insert([{
        name: cleanName,
        mobile: cleanMobile,
        loan_type: String(loanType).trim(),
        loan_amount: amount,
        return_year: String(returnYear || ""),
        percentage: rate,
        status: "Pending",
        aadhaar_last4: String(aadhaarLast4 || ""),
        pan_last4: String(panLast4 || ""),
        charge: chargeValue,
        charge_amount: chargeAmountValue,
        bank_name: String(bankName || ""),
        account_holder_name: String(accountHolderName || ""),
        account_number: String(accountNumber || ""),
        ifsc_code: String(ifscCode || ""),
        upi_number: String(upiNumber || "")
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not save application. Check the Supabase table columns."
      });
    }

    return res.status(201).json({
      success: true,
      application: data
    });
  } catch (error) {
    console.error("Submit error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
});

// Admin: list demo applications
app.get("/admin/applications", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: "Supabase is not configured."
      });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Admin list error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not load applications."
      });
    }

    return res.json({
      success: true,
      applications: data || []
    });
  } catch (error) {
    console.error("Admin error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
});

// Check the latest demo application using its mobile number
app.get("/check-application", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: "Supabase is not configured."
      });
    }

    const mobile = String(req.query.mobile || "").trim();

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit demo mobile number."
      });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("id,name,mobile,loan_type,loan_amount,return_year,percentage,status,created_at")
      .eq("mobile", mobile)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Status lookup error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not check application status."
      });
    }

    return res.json({
      success: true,
      application: data || null
    });
  } catch (error) {
    console.error("Status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
});

app.get("/account-details", (req, res) => {
  res.json({
    success: true,
    accountDetails: {}
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found."
  });
});

app.listen(PORT, () => {
  console.log("Demo API listening on port " + PORT);
});
