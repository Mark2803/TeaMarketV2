import { prisma } from "../../database/prisma.js";
import type { AddressBody, UpdateAddressBody } from "./customer-addresses.schemas.js";

const select = {
  id: true, address_name: true, recipient_name: true, phone: true,
  region: true, city: true, street: true, house: true, apartment: true,
  postal_code: true, comment: true, is_default: true,
  created_at: true, updated_at: true
} as const;

function data(input: AddressBody | UpdateAddressBody) {
  return {
    ...(input.addressName !== undefined ? { address_name: input.addressName } : {}),
    ...(input.recipientName !== undefined ? { recipient_name: input.recipientName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.region !== undefined ? { region: input.region || null } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.street !== undefined ? { street: input.street } : {}),
    ...(input.house !== undefined ? { house: input.house } : {}),
    ...(input.apartment !== undefined ? { apartment: input.apartment || null } : {}),
    ...(input.postalCode !== undefined ? { postal_code: input.postalCode || null } : {}),
    ...(input.comment !== undefined ? { comment: input.comment || null } : {}),
    ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {})
  };
}

export async function listAddresses(customerId: string) {
  return prisma.customer_addresses.findMany({
    where: { customer_id: customerId }, select,
    orderBy: [{ is_default: "desc" }, { created_at: "desc" }]
  });
}

export async function createAddress(customerId: string, input: AddressBody) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.customer_addresses.count({ where: { customer_id: customerId } });
    const makeDefault = input.isDefault === true || count === 0;
    if (makeDefault) await tx.customer_addresses.updateMany({ where: { customer_id: customerId }, data: { is_default: false } });
    return tx.customer_addresses.create({
      data: {
        customer_id: customerId,
        address_name: input.addressName,
        recipient_name: input.recipientName,
        phone: input.phone,
        region: input.region || null,
        city: input.city,
        street: input.street,
        house: input.house,
        apartment: input.apartment || null,
        postal_code: input.postalCode || null,
        comment: input.comment || null,
        is_default: makeDefault
      },
      select
    });
  });
}

export async function updateAddress(customerId: string, id: string, input: UpdateAddressBody) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer_addresses.findFirst({ where: { id, customer_id: customerId } });
    if (!existing) return null;
    if (input.isDefault === true) await tx.customer_addresses.updateMany({ where: { customer_id: customerId }, data: { is_default: false } });
    return tx.customer_addresses.update({ where: { id }, data: data(input), select });
  });
}

export async function deleteAddress(customerId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer_addresses.findFirst({ where: { id, customer_id: customerId } });
    if (!existing) return false;
    await tx.customer_addresses.delete({ where: { id } });
    if (existing.is_default) {
      const next = await tx.customer_addresses.findFirst({ where: { customer_id: customerId }, orderBy: { created_at: "desc" } });
      if (next) await tx.customer_addresses.update({ where: { id: next.id }, data: { is_default: true } });
    }
    return true;
  });
}
