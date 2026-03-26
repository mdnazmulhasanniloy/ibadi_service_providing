import config from '@app/config/index.js';
import HashPassword from '@app/shared/hashPassword.js';
import prisma from '@app/shared/prisma.js';

export async function defaultTask() {
  // Add your default task here
  const email = config?.admin_credentials?.email || 'admin@gmail.com';
  // check admin is exist

  const admin = await prisma.user.findFirst({
    where: {
      role: 'admin',
    },
  });
  if (!admin) {
    await prisma.user.upsert({
      where: { email },
      update: {
        role: 'admin',
      },
      create: {
        name: 'MD Admin',
        email,
        phoneNumber: '+8801321834780',
        password: await HashPassword('112233'),
        role: 'admin',
        expireAt: null,
        location: {
          type: 'Point',
          coordinates: [37.7749, -122.4194],
        },
        verification: {
          create: {
            otp: 0,
            status: true,
          },
        },
      },
    });
  }

  const content = await prisma?.contents.findFirst({});
  if (!content) {
    await prisma.contents.create({
      data: {
        termsAndCondition:
          'These are the terms and conditions of our service...',
        privacyPolicy:
          'We value your privacy and ensure your data is protected...',
        refundPolicy: 'Refunds are processed within 7-10 business days...',
        shippingPolicy: 'Orders are shipped within 3-5 business days...',
        aboutUs: 'We are a company dedicated to providing quality products...',
        location: 'Dhaka, Bangladesh',
        copyRight: '© 2026 Your Company Name. All rights reserved.',
        footerText: 'Thank you for visiting our website.',
      },
    });
  }
}
