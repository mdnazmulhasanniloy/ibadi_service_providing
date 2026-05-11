import StripeService from '@app/class/string.class.js';
import prisma from '@app/shared/prisma.js';

export const resolveStripeCustomer = async (user: {
  id: string;
  email: string;
  name?: string | null;
  customerId?: string | null;
}): Promise<string> => {
  try {
    if (user.customerId) return user.customerId;

    const customer = await StripeService.createCustomer(
      user.email,
      user.name ?? 'Customer',
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { customerId: customer!.id },
    });

    return customer!.id;
  } catch (error: any) {
    console.log(error);
    throw new Error(error.message);
  }
};
