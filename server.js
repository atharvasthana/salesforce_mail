import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();
console.log("Loaded ENV:", process.env.SMTP_USER, process.env.SMTP_PASS ? "PASSWORD_LOADED" : "NO_PASSWORD");

const app = express();
app.use(express.json());
app.use(cors());

// Security: Rate limit Salesforce to avoid spam
const limiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 60
});
app.use(limiter);

// SMTP Transporter (GoDaddy or Outlook)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == "465",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Health check
app.get("/", (req, res) => {
    res.send("Email API Running");
});

// Main email endpoint (NO TIMEOUT METHOD)
app.post("/sendEmail", async (req, res) => {

    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ status: "error", message: "Missing fields" });
    }

    // 1️⃣ Respond to Salesforce IMMEDIATELY (avoids Read Timeout)
    res.json({ status: "queued" });

    // 2️⃣ Send email asynchronously AFTER response  
    setTimeout(async () => {
        try {
            const info = await transporter.sendMail({
                from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
                to,
                subject,
                text: body
            });

            console.log("Email sent:", info.messageId);

        } catch (err) {
            console.error("Async Email Send Error:", err.message);
        }
    }, 10); // slight delay so Salesforce gets immediate response
});

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Email API running on port ${PORT}`);
});
