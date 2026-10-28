"use strict";

// Render backend URL
const API_BASE_URL =
  "https://reliance-finance-4fhm.onrender.com";

const customerForm = document.getElementById("customerForm");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);
}

function showAdminMessage(message, color = "#0757a8") {
  const box = document.getElementById("adminMessage");
  if (!box) return;
  box.textContent = message;
  box.style.color = color;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

// ADMIN: submit a demo application
if (customerForm) {
  customerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const getValue = (id) =>
      document.getElementById(id)?.value?.trim() || "";

    const mobile = getValue("mobileNumber");
    const loanAmount = getValue("loanAmount");
    const percentage = getValue("percentage") || "0";

    if (!/^\d{10}$/.test(mobile)) {
      showAdminMessage("Enter a valid 10-digit demo mobile number.", "red");
      return;
    }

    if (
      !loanAmount ||
      !Number.isFinite(Number(loanAmount)) ||
      Number(loanAmount) <= 0
    ) {
      showAdminMessage("Enter a valid demo loan amount.", "red");
      return;
    }

    if (
      !Number.isFinite(Number(percentage)) ||
      Number(percentage) < 0 ||
      Number(percentage) > 100
    ) {
      showAdminMessage("Percentage must be between 0 and 100.", "red");
      return;
    }

    const button = customerForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    showAdminMessage("Saving demo application...");

    try {
      await apiRequest("/submit-application", {
        method: "POST",
        body: JSON.stringify({
          name: getValue("customerName"),
          mobile,
          loanType: getValue("loanType"),
          loanAmount,
          returnYear: getValue("returnYear"),
          percentage,
          aadhaarLast4: getValue("aadhaarLast4"),
          panLast4: getValue("panLast4"),
          charge: getValue("charge"),
          chargeAmount: getValue("chargeAmount") || "0",
          bankName: getValue("bankName"),
          accountHolderName: getValue("accountHolderName"),
          accountNumber: getValue("accountNumber"),
          ifscCode: getValue("ifscCode"),
          upiNumber: getValue("upiNumber")
        })
      });

      showAdminMessage(
        "Demo application saved successfully.",
        "green"
      );

      customerForm.reset();
      await loadCustomers();
    } catch (error) {
      console.error(error);
      showAdminMessage(error.message || "Could not save application.", "red");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// ADMIN: show saved applications
async function loadCustomers() {
  const list = document.getElementById("customerList");
  if (!list) return;

  list.textContent = "Loading applications...";

  try {
    const result = await apiRequest("/admin/applications");
    const applications = result.applications || [];

    if (!applications.length) {
      list.textContent = "No applications found yet.";
      return;
    }

    list.innerHTML = "";

    applications.forEach((item) => {
      const card = document.createElement("div");
      card.className = "customer-record";

      card.innerHTML = `
        <p><b>Application ID:</b> ${escapeHtml(item.id)}</p>
        <p><b>Name:</b> ${escapeHtml(item.name)}</p>
        <p><b>Mobile:</b> ${escapeHtml(item.mobile)}</p>
        <p><b>Loan Type:</b> ${escapeHtml(item.loan_type)}</p>
        <p><b>Loan Amount:</b> ₹${Number(item.loan_amount || 0).toLocaleString("en-IN")}</p>
        <p><b>Return Period:</b> ${escapeHtml(item.return_year || "-")}</p>
        <p><b>Progress:</b> ${Number(item.percentage || 0)}%</p>
        <p><b>Status:</b> ${escapeHtml(item.status || "Pending")}</p>
        <p><b>Submitted:</b> ${escapeHtml(item.created_at || "-")}</p>
      `;

      list.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    list.textContent = "Could not load applications. Check the server and database.";
  }
}

// STATUS PAGE: look up the latest application by mobile number
async function checkStatus() {
  const mobileInput = document.getElementById("mobileNumber");
  const resultBox = document.getElementById("statusResult");

  if (!mobileInput || !resultBox) return;

  const mobile = mobileInput.value.trim();

  if (!/^\d{10}$/.test(mobile)) {
    resultBox.textContent = "Enter a valid 10-digit demo mobile number.";
    return;
  }

  resultBox.textContent = "Checking application...";

  try {
    const result = await apiRequest(
      "/check-application?mobile=" + encodeURIComponent(mobile)
    );

    const item = result.application;

    if (!item) {
      resultBox.textContent = "No application found for this demo number.";
      return;
    }

    resultBox.innerHTML = `
      <div class="status-card">
        <h3>Demo Application Status</h3>
        <p><b>Application ID:</b> ${escapeHtml(item.id)}</p>
        <p><b>Name:</b> ${escapeHtml(item.name)}</p>
        <p><b>Mobile:</b> ${escapeHtml(item.mobile)}</p>
        <p><b>Loan Type:</b> ${escapeHtml(item.loan_type)}</p>
        <p><b>Loan Amount:</b> ₹${Number(item.loan_amount || 0).toLocaleString("en-IN")}</p>
        <p><b>Return Period:</b> ${escapeHtml(item.return_year || "-")}</p>
        <p><b>Progress:</b> ${Number(item.percentage || 0)}%</p>
        <p><b>Status:</b> ${escapeHtml(item.status || "Pending")}</p>
        <p><b>Submitted:</b> ${escapeHtml(item.created_at || "-")}</p>
        <p>This is demo information only, not a loan approval.</p>
      </div>
    `;
  } catch (error) {
    console.error(error);
    resultBox.textContent =
      error.message || "Unable to check status. Please try again.";
  }
}

// Mobile navigation
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");

if (menuBtn && mainNav) {
  menuBtn.addEventListener("click", () => {
    mainNav.classList.toggle("menu-open");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("menu-open");
    });
  });
}

// Load list only on the admin page
loadCustomers();
