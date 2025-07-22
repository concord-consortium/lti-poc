import { Tag } from "./tags";

export type Platform = "schoology" | "canvas" | "moodle";

export type Client = {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  tags: Tag[]|"*";
  disabled?: boolean; // optional field to disable the client
}

export const clients: Client[] = [

  // use this for local testing with ngrok and MooDIY

  {
    id: "DWlzm6Imq9vN286",
    name: "CC Moodle All Resources (ngrok)",
    description: "All Resources on Moodle (ngrok)",
    platform: "moodle",
    tags: "*" // "*" means all tags are enabled
  },

  {
    id: "xC2r1SuSGMU1k19",
    name: "CC Moodle All Resources",
    description: "All Resources on Moodle",
    platform: "moodle",
    tags: "*" // "*" means all tags are enabled
  },
  {
    id: "NXoG9Y4eyctXndq",
    name: "CC NGSS Moodle Demo",
    description: "NGSS Demo on Moodle",
    platform: "moodle",
    tags: ["ngss-elementary-school", "ngss-middle-school"]
  },
  {
    id: "Rkl1PVOuOoKwcws",
    name: "CC Non-NGSS Moodle Demo",
    description: "Non-NGSS Demo on Moodle",
    platform: "moodle",
    tags: ["building-models", "interactions", "inquiryspace"]
  },

  {
    id: "7891789684",
    name: "CC Schoology All Resources",
    description: "All Resources on Schoology",
    platform: "schoology",
    tags: "*" // "*" means all tags are enabled
  },
  {
    id: "7891791538",
    name: "CC NGSS Schoology Demo",
    description: "NGSS Demo on Schoology",
    platform: "schoology",
    tags: ["ngss-elementary-school", "ngss-middle-school"]
  },
  {
    id: "7891794676",
    name: "CC Non-NGSS Schoology Demo",
    description: "Non-NGSS Demo on Schoology",
    platform: "schoology",
    tags: ["building-models", "interactions", "inquiryspace"]
  },

  {
    disabled: true, // this client is disabled
    id: "TODO",
    name: "CC Canvas All Resources",
    description: "All Resources on Canvas",
    platform: "canvas",
    tags: "*" // "*" means all tags are enabled
  },
  {
    disabled: true, // this client is disabled
    id: "TODO",
    name: "CC NGSS Canvas Demo",
    description: "NGSS Demo on Canvas",
    platform: "canvas",
    tags: ["ngss-elementary-school", "ngss-middle-school"]
  },
  {
    disabled: true, // this client is disabled
    id: "TODO",
    name: "CC Non-NGSS Canvas Demo",
    description: "Non-NGSS Demo on Canvas",
    platform: "canvas",
    tags: ["building-models", "interactions", "inquiryspace"]
  },
];