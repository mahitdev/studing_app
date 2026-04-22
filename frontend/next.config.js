/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: false,
  register: true,
  skipWaiting: true
});

const nextConfig = {};

module.exports = withPWA(nextConfig);