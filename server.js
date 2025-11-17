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
    windowMs: 60 * 1000, // 1 minute
    max: 60             // 60 requests/min from Salesforce
});
app.use(limiter);

// Create reusable transporter for GoDaddy SMTP
const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465, // For SSL
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,   // full email e.g. support@buymeabook.co.in
        pass: process.env.SMTP_PASS    // email password (not GoDaddy account password)
    },
    tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false
    }
});


// Health check endpoint (Salesforce can ping this)
app.get("/", (req, res) => {
    res.send("Email API Running");
});

// Main email sending route
app.post("/sendEmail", async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ status: "error", message: "Missing fields" });
        }

        const info = await transporter.sendMail({
            from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
            to,
            subject,
            text: body
        });

        res.json({
            status: "sent",
            messageId: info.messageId
        });

    } catch (error) {
        console.error("Email send error:", error);
        res.status(500).json({ status: "failed", error: error.message });
    }
});

// Use environment PORT (Render/Vercel/Railway) or fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Email API running on port ${PORT}`);
});


