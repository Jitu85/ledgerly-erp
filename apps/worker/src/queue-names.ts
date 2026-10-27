export const queueNames = {
  auditDelivery: "audit-delivery",
  emailDelivery: "email-delivery",
  foundationMaintenance: "foundation-maintenance",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

export type TenantJob<T> = {
  companyId: string;
  correlationId: string;
  payload: T;
};
