export const tags = [
  "dev",
  "interactions",
  "inquiryspace",
  "building-models",
  "ngss-elementary-school",
  "ngss-middle-school",
] as const;

export type Tag = (typeof tags)[number];

