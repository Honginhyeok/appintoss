import webpush from 'web-push';

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BJw32U00yq1WQQlJv1p34E7gV_9B5j_I3hJqZbF8SIfVlLZd7Yy1_y7m1530TjAEX7FhE-UvDqXJ-tX_U2qB6G4';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'rA-eX9g2H4cJf1V8q5tZ7wY0hL3v1D4w5G9a6D2wE5w';
export const VAPID_SUBJECT = 'mailto:admin@checkincaptain.com';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default webpush;
