require("dotenv").config();
const { verifyEmailConnection, sendTestEmail } = require("../services/emailService");

async function main() {
    console.log("==================================================");
    console.log("   📧 SNIPFORGE EMAIL FUNCTIONALITY TESTER");
    console.log("==================================================");
    console.log(`SMTP Service: ${process.env.SMTP_SERVICE || "N/A"}`);
    console.log(`SMTP User:    ${process.env.SMTP_USER || "N/A"}`);
    console.log(`Email From:   ${process.env.EMAIL_FROM || "N/A"}`);
    console.log("==================================================\n");

    console.log("Step 1: Testing SMTP Server Connection...");
    const verification = await verifyEmailConnection();

    if (!verification.success) {
        console.error("❌ SMTP Verification Failed:", verification.error);
        process.exit(1);
    }

    const recipient = process.argv[2] || process.env.SMTP_USER;
    console.log(`\nStep 2: Sending Test Email to ${recipient}...`);

    try {
        const result = await sendTestEmail(recipient);
        console.log("\n==================================================");
        console.log("✅ TEST COMPLETED SUCCESSFULLY!");
        console.log(`Message ID: ${result.info.messageId}`);
        if (result.previewUrl) {
            console.log(`Ethereal Preview: ${result.previewUrl}`);
        }
        console.log("==================================================");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Failed to send test email:", err.message);
        process.exit(1);
    }
}

main();
