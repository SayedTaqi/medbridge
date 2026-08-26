export async function sendSms(to: string, message: string) {
  const key = process.env.MSG91_AUTH_KEY;
  if (!key) return;
  const mobile = to.replace(/^\+?91/, '');
  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: key },
    body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID, sender: process.env.MSG91_SENDER_ID, mobiles: `91${mobile}`, message }),
  });
  if (!response.ok) throw new Error(`MSG91 request failed: ${response.status}`);
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend request failed: ${response.status}`);
}
