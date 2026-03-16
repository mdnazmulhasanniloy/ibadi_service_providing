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
        refundPolicy: 'This is Refund policy page',
        shippingPolicy: 'This is Shipping policy page',
        aboutUs: 'This is About us page',
        termsAndCondition: 'This is Terms and condition page',
        privacyPolicy: 'This is privacy policy page',
        location: '2972 Westheimer Rd. Santa Ana, Illinois 85486 ',
        copyRight: 'UniStore © 2025, All Rights Reserved',
        footerText:
          'We have clothes that suits your style and which you’re proud to wear. From women to men.',
      },
    });
  }
}
