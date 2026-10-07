export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function otpExpiry(minutes = 10) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}
