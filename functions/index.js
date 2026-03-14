/**
 * DelgadoLogic — Automated Fulfillment Pipeline
 * Cloud Functions v2 | Node 20
 * 
 * Functions:
 *   1. handlePayPalWebhook — Verifies PayPal payment & delivers product
 *   2. healthCheck — Daily PayPal API heartbeat
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Secret Manager references
const paypalClientId = defineSecret("paypal-client-id");
const paypalSecret = defineSecret("paypal-secret");

// Constants
const PAYPAL_API = "https://api-m.paypal.com";
const PRODUCT_BUCKET = "delgadologic-products";
const PDF_PATH = "product/Win11_AudioRestore_Pro_Guide_DelgadoLogic.pdf";
const HOSTED_BUTTON_ID = "9K83MQVDBSW5U";
const EXPECTED_AMOUNT = "4.99";
const SITE_URL = "https://delgadologic.tech";
const SALES_COLLECTION = "artifacts/delgadologic/public/data/sales";
const HEALTH_COLLECTION = "artifacts/delgadologic/public/data/health";

// ──────────────────────────────────────────────
// Helper: Get PayPal OAuth Token
// ──────────────────────────────────────────────
async function getPayPalToken(clientId, secret) {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// ──────────────────────────────────────────────
// Helper: Verify PayPal Capture
// ──────────────────────────────────────────────
async function verifyCapture(token, captureId) {
  const res = await fetch(`${PAYPAL_API}/v2/payments/captures/${captureId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PayPal verify error: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// Helper: Generate 24-hour Signed URL
// ──────────────────────────────────────────────
async function generateSignedUrl() {
  const bucket = storage.bucket(PRODUCT_BUCKET);
  const file = bucket.file(PDF_PATH);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return url;
}

// ──────────────────────────────────────────────
// Helper: Send Delivery Email
// Synced to: documentation/fulfillment_email_template.md
// ──────────────────────────────────────────────
async function sendDeliveryEmail(payerEmail, payerName, downloadUrl, captureId) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "madelgado0490@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD || "",
    },
  });

  // Generate a deterministic Diagnostic ID from the capture
  const diagId = `DL-${captureId.substring(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const mailOptions = {
    from: '"DelgadoLogic" <support@delgadologic.tech>',
    to: payerEmail,
    subject: `⚡ Your Download: Windows 11 AudioRestore Pro Guide [Order ${captureId}]`,
    html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #e2e8f0; border-radius: 16px; overflow: hidden;">

  <!-- Header Bar -->
  <div style="background: #2563eb; padding: 20px 32px;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">DELGADOLOGIC</h1>
  </div>

  <!-- Body -->
  <div style="padding: 32px;">

    <h2 style="color: #2563eb; font-size: 22px; margin: 0 0 4px 0;">⚡ Payment Confirmed</h2>
    <p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Order ID: ${captureId}</p>

    <p style="color: #e2e8f0; font-size: 14px; line-height: 1.7; margin: 0 0 8px 0;">Hello,</p>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0;">
      Thank you for your purchase from DelgadoLogic. Your payment was successful, and your professional recovery assets are ready for download.
    </p>

    <!-- Download Section -->
    <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
      <h3 style="color: #2563eb; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0;">📥 Your Secure Download</h3>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
        Click below to access your <strong style="color: #e2e8f0;">Pro Guide (PDF)</strong> and the <strong style="color: #e2e8f0;">Ultra v4.0 Diagnostic Script (.ps1)</strong>.
      </p>
      <a href="${downloadUrl}" style="display: inline-block; background: #22c55e; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
        DOWNLOAD YOUR RECOVERY SUITE
      </a>
      <p style="color: #475569; font-size: 11px; margin: 12px 0 0 0; font-style: italic;">
        This link is unique to your transaction and will expire in 24 hours for security.
      </p>
    </div>

    <!-- Quick Start Section -->
    <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
      <h3 style="color: #2563eb; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">🛠️ Quick Start: Running the Ultra v4.0 Script</h3>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0;">To ensure the hardware-level patches are applied correctly, please follow these &quot;Lead Engineer&quot; steps:</p>

      <!-- Step 1: Admin -->
      <div style="display: flex; margin: 0 0 14px 0;">
        <div style="background: #2563eb; color: #fff; width: 22px; height: 22px; min-width: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; margin-right: 12px;">1</div>
        <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0;">
          <strong>Run as Administrator:</strong> <span style="color: #94a3b8;">Click Start, type</span> <strong>PowerShell</strong><span style="color: #94a3b8;">, right-click it, and select</span> <em style="color: #2563eb; font-weight: 600;">Run as Administrator</em>.
        </p>
      </div>

      <!-- Step 2: Execution Policy -->
      <div style="display: flex; margin: 0 0 14px 0;">
        <div style="background: #2563eb; color: #fff; width: 22px; height: 22px; min-width: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; margin-right: 12px;">2</div>
        <div style="margin: 0;">
          <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0 0 6px 0;">
            <strong>Enable Execution:</strong> <span style="color: #94a3b8;">Copy and paste this command into the window and hit Enter:</span>
          </p>
          <code style="display: block; background: #000; color: #22c55e; padding: 8px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b; font-family: 'Consolas', 'Courier New', monospace;">
            Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
          </code>
        </div>
      </div>

      <!-- Step 3: Call Operator -->
      <div style="display: flex; margin: 0;">
        <div style="background: #2563eb; color: #fff; width: 22px; height: 22px; min-width: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; margin-right: 12px;">3</div>
        <p style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0;">
          <strong>Execute the Fix:</strong> <span style="color: #94a3b8;">If your folder path has spaces, type</span> <code style="color: #2563eb; font-weight: 700;">&amp;</code> <span style="color: #94a3b8;">(ampersand + space), then right-click to paste the file path in quotes, and hit Enter.</span>
        </p>
      </div>
    </div>

    <!-- Transaction Details -->
    <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
      <h3 style="color: #2563eb; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0;">📝 Transaction Details</h3>
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Order ID</td><td style="color: #e2e8f0; text-align: right; font-weight: 600;">${captureId}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Diagnostic ID</td><td style="color: #e2e8f0; text-align: right; font-family: monospace; font-weight: 600;">${diagId}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Support</td><td style="color: #94a3b8; text-align: right; font-size: 11px;">Reply to this email for hardware-specific adjustments</td></tr>
      </table>
    </div>

    <!-- Signature -->
    <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 8px;">
      <p style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin: 0;">Manuel Alejandro Delgado</p>
      <p style="color: #64748b; font-size: 11px; margin: 2px 0 0 0;">Lead Systems Engineer · <a href="https://delgadologic.tech" style="color: #2563eb; text-decoration: none;">DelgadoLogic.tech</a></p>
    </div>
  </div>
</div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ══════════════════════════════════════════════
// FUNCTION 1: handlePayPalWebhook
// Listens for PAYMENT.CAPTURE.COMPLETED events
// ══════════════════════════════════════════════
exports.handlePayPalWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [paypalClientId, paypalSecret],
    cors: false,
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const event = req.body;

      // Validate event type
      if (!event || event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
        console.warn("Ignored event:", event?.event_type || "unknown");
        return res.status(200).json({ status: "ignored" });
      }

      const resource = event.resource;
      const captureId = resource?.id;
      const amount = resource?.amount?.value;
      const currency = resource?.amount?.currency_code;
      const payerEmail = event?.resource?.payer?.email_address ||
                         resource?.supplementary_data?.related_ids?.order_id || "";

      console.log(`[Webhook] Capture: ${captureId}, Amount: ${amount} ${currency}`);

      // Verify amount
      if (amount !== EXPECTED_AMOUNT) {
        console.warn(`[Webhook] Unexpected amount: ${amount}, expected ${EXPECTED_AMOUNT}`);
        return res.status(400).json({ error: "Invalid payment amount" });
      }

      // Authenticate with PayPal and verify the capture
      const token = await getPayPalToken(
        paypalClientId.value(),
        paypalSecret.value()
      );
      const capture = await verifyCapture(token, captureId);

      if (capture.status !== "COMPLETED") {
        console.error(`[Webhook] Capture not completed: ${capture.status}`);
        return res.status(400).json({ error: "Capture not verified" });
      }

      console.log(`[Webhook] ✓ Verified capture ${captureId}`);

      // Log sale to Firestore
      const saleRef = db.doc(`${SALES_COLLECTION}/${captureId}`);
      await saleRef.set({
        captureId,
        amount: parseFloat(amount),
        currency,
        payerEmail: payerEmail || "unknown",
        status: "completed",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        product: "Win11_AudioRestore_Pro_Guide",
      });

      // Generate signed download URL
      const downloadUrl = await generateSignedUrl();

      // Send delivery email (best-effort — don't block on failure)
      if (payerEmail && payerEmail.includes("@")) {
        try {
          const payerName = resource?.payer?.name?.given_name || "";
          await sendDeliveryEmail(payerEmail, payerName, downloadUrl, captureId);
          console.log(`[Webhook] ✓ Email sent to ${payerEmail}`);
        } catch (emailErr) {
          console.error("[Webhook] Email failed (non-blocking):", emailErr.message);
        }
      }

      // Update sale record with delivery info
      await saleRef.update({
        downloadUrl,
        emailSent: payerEmail ? true : false,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Redirect user to success page
      return res.redirect(302, `${SITE_URL}/?session=success`);

    } catch (err) {
      console.error("[Webhook] Fatal error:", err);
      return res.status(500).json({ error: "Internal fulfillment error" });
    }
  }
);

// ══════════════════════════════════════════════
// FUNCTION 2: healthCheck
// Daily ping to verify PayPal API credentials
// ══════════════════════════════════════════════
exports.healthCheck = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "America/New_York",
    region: "us-central1",
    secrets: [paypalClientId, paypalSecret],
  },
  async () => {
    const now = new Date().toISOString();
    try {
      const token = await getPayPalToken(
        paypalClientId.value(),
        paypalSecret.value()
      );

      console.log(`[HealthCheck] ✓ PayPal API accessible at ${now}`);

      await db.doc(`${HEALTH_COLLECTION}/latest`).set({
        status: "healthy",
        message: "PayPal API credentials valid",
        tokenPreview: token.substring(0, 10) + "...",
        checkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`[HealthCheck] ✗ PayPal API failed at ${now}:`, err.message);

      await db.doc(`${HEALTH_COLLECTION}/latest`).set({
        status: "unhealthy",
        message: err.message,
        checkedAt: admin.firestore.FieldValue.serverTimestamp(),
        alert: true,
      });
    }
  }
);
