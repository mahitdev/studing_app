const nodemailer = require("nodemailer");
const DailyGoal = require("../models/DailyGoal");

let transporter = null;

function createTransporter() {
  const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
  const SMTP_PORT = String(process.env.SMTP_PORT || "587").trim();
  const SMTP_USER = String(process.env.SMTP_USER || "").trim();
  const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
  const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").trim();

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = createTransporter();
  return transporter;
}

function weekFromKey() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return from.toISOString().slice(0, 10);
}

async function buildUserSummary(user) {
  const userId = user._id;
  const today = new Date().toISOString().slice(0, 10);
  const weeklyFrom = weekFromKey();
  const goals = await DailyGoal.find({ userId }).sort({ date: 1 });

  const totalMinutes = goals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const todayGoal = goals.find((g) => g.date === today);
  const weeklyGoals = goals.filter((g) => g.date >= weeklyFrom && g.date <= today);
  const weeklyMinutes = weeklyGoals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const completedDays = goals.filter((g) => g.completed).length;
  const completionRate = goals.length ? Math.round((completedDays / goals.length) * 100) : 0;

  return {
    todayMinutes: todayGoal?.studiedMinutes || 0,
    weeklyHours: +(weeklyMinutes / 60).toFixed(1),
    totalHours: +(totalMinutes / 60).toFixed(1),
    completionRate
  };
}

async function sendProgressEmail(user, email) {
  const mailer = getTransporter();
  const summary = await buildUserSummary(user);
  const fromEmail = String(process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@grindlock.com").trim();
  const appUrl = String(process.env.APP_URL || "https://grindlock.vercel.app").trim();

  if (!mailer) {
    console.log("--- SIMULATED EMAIL ---");
    console.log(`To: ${email}`);
    console.log(`Subject: Your GrindLock Progress Summary`);
    console.log(`Body: ${JSON.stringify(summary)}`);
    console.log("------------------------");
    return summary;
  }

  const subject = `Your GrindLock Progress Summary`;
  const text = [
    `Hi ${user.name || "there"},`,
    ``,
    `Here is your current GrindLock summary:`,
    `- Time studied today: ${summary.todayMinutes} minutes`,
    `- Weekly study time: ${summary.weeklyHours} hours`,
    `- Total study time: ${summary.totalHours} hours`,
    `- Goal completion rate: ${summary.completionRate}%`,
    ``,
    `Keep building consistency.`,
    `Open app: ${appUrl}`
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:20px;background:#0b1220;color:#e6edf9;border-radius:14px;">
      <h2 style="margin:0 0 10px;">GrindLock Progress Summary</h2>
      <p style="color:#b8c6dd;">Hi ${user.name || "there"}, here is your latest study snapshot.</p>
      <ul style="line-height:1.8;">
        <li><strong>Time studied today:</strong> ${summary.todayMinutes} minutes</li>
        <li><strong>Weekly study time:</strong> ${summary.weeklyHours} hours</li>
        <li><strong>Total study time:</strong> ${summary.totalHours} hours</li>
        <li><strong>Goal completion rate:</strong> ${summary.completionRate}%</li>
      </ul>
      <a href="${appUrl}" style="display:inline-block;margin-top:10px;padding:10px 14px;border-radius:999px;background:#7c8cff;color:#fff;text-decoration:none;">Open GrindLock</a>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: fromEmail,
      to: email,
      subject,
      text,
      html
    });
  } catch (err) {
    console.error(`❌ Email transmission failed: ${err.message}`);
    console.log("--- FALLING BACK TO SIMULATED LOG ---");
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${JSON.stringify(summary)}`);
    console.log("-------------------------------------");
  }

  return summary;
}

module.exports = { sendProgressEmail };
