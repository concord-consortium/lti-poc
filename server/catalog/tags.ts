export const tags = [
  "dev",
  "interactions",
  "inquiryspace",
  "building-models",
  "ngss-elementary-school",
  "ngss-middle-school",
  "moth-ed"
] as const;

export type Tag = (typeof tags)[number];

