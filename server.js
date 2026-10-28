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

// Save demo application
app.post("/submit-application", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: "Supabase is not configured."
      });
    }

    const body = req.body || {};
    const name = String(body.name || "").trim();
    const mobile = String(body.mobile || "").trim();
    const loanType = String(body.loanType || "").trim();
    const loanAmount = Number(body.loanAmount);
    const percentage = Number(body.percentage ?? 0);
    const charge = String(body.charge || "").trim();

    const chargeAmount =
      body.chargeAmount === "" ||
      body.chargeAmount === undefined ||
      body.chargeAmount === null
        ? 0
        : Number(body.chargeAmount);

    if (!name || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a name and valid 10-digit demo mobile number."
      });
    }

    if (
      !loanType ||
      !Number.isFinite(loanAmount) ||
      loanAmount <= 0 ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100 ||
      !Number.isFinite(chargeAmount) ||
      chargeAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Check the loan amount, type, percentage and charge."
      });
    }

    const { data, error } = await supabase
      .from("applications")
      .insert([{
        name,
        mobile,
        loan_type: loanType,
        loan_amount: loanAmount,
        return_year: String(body.returnYear || ""),
        percentage,
        status: "Pending",
        aadhaar_last4: String(body.aadhaarLast4 || ""),
        pan_last4: String(body.panLast4 || ""),
        charge,
        charge_amount: chargeAmount,
        bank_name: String(body.bankName || ""),
        account_holder_name: String(body.accountHolderName || ""),
        account_number: String(body.accountNumber || ""),
        ifsc_code: String(body.ifscCode || ""),
        upi_number: String(body.upiNumber || "")
      }])
      .select("id,name,mobile,loan_type,loan_amount,return_year,percentage,status,created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not save application. Check Supabase key, RLS and database columns."
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

// Demo admin list — not suitable for real customer data without authentication
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
      .select("id,name,mobile,loan_type,loan_amount,return_year,percentage,status,created_at")
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

// Demo status lookup.
// This route returns bank fields only because this is a demo.
// Do not store or return real customer banking information publicly.
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
      .select("id,name,mobile,loan_type,loan_amount,return_year,percentage,status,created_at,bank_name,account_holder_name,account_number,ifsc_code,upi_number")
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
