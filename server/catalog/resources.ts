import { Tag } from "./tags";

export type BaseTool = {
  type: string;
}
export type ApTool = BaseTool & { type: "ap", activity?: string, sequence?: string }
export type ClueTool = BaseTool & { type: "clue", problem: string, unit: string }
export type InternalTool = BaseTool & { type: "internal" }
export type Tool = InternalTool | ApTool | ClueTool;

export type Resource = {
  slug: string;
  title: string;
  description: string;
  tool: Tool
  tags: Tag[];
}

const devResources: Resource[] = [
  {
    slug: "ap-launch-demo",
    title: "AP Launch Demo",
    description: "A demo resource for launching the AP tool.",
    tool: {type: "internal"},
    tags: ["dev"]
  },
  {
    slug: "names-and-roles-demo",
    title: "Names and Roles Demo",
    description: "A demo resource for testing names and roles.",
    tool: {type: "internal"},
    tags: ["dev"]
  },
  {
    slug: "token-debugger",
    title: "Token Debugger",
    description: "A tool for debugging tokens.",
    tool: {type: "internal"},
    tags: ["dev"]
  },
  {
    slug: "grading-demo",
    title: "Grading Demo",
    description: "A demo resource for grading.",
    tool: {type: "internal"},
    tags: ["dev"]
  }
];

const elementarySchoolResources: Resource[] = [
  {
    slug: "falling-blocks",
    title: "Falling Blocks (ID# 167-01-3-P01)",
    description: "Students observe blocks falling down and then ask questions about the forces that caused the blocks to start moving. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/10445.json"},
    tags: ["ngss-elementary-school"]
  },
  {
    slug: "yasmin-helps-clean",
    title: "Yasmin helps clean (ID# 235-01-3-P01)",
    description: "Students observe pieces of paper moving when a vacuum cleaner and a hair dryer is used on them, and then ask questions about the forces that caused the paper to start moving. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/11402.json"},
    tags: ["ngss-elementary-school"]
  },
  {
    slug: "planning-to-study-bowling",
    title: "Planning to Study Bowling (ID# 169-01-3-P02)",
    description: "Students think about the forces involved in bowling, and plan an investigation into what happens to the bowling pins when the forces change. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/10446.json"},
    tags: ["ngss-elementary-school"]
  },
  {
    slug: "planning-to-study-tug-of-war",
    title: "Planning to Study Tug-of-War (ID# 170-01-3-P02)",
    description: "Students think about the forces involved in a game of tug-of-war, and plan an investigation of what happens to the forces when players wear different types of shoes. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/10470.json"},
    tags: ["ngss-elementary-school"]
  },
  {
    slug: "tug-of-war-investigation-1",
    title: "Tug-of-War Investigation #1 (ID# 171-02-3-P03)",
    description: "Students use a tug-of-war simulation to investigate patterns in how much force different teams use and if they win. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/11441.json"},
    tags: ["ngss-elementary-school"]
  },
  {
    slug: "tug-of-war-investigation-2",
    title: "Tug-of-War Investigation #2 (ID# 172-02-3-P03)",
    description: "Students use a tug-of-war simulation to investigate patterns in how much force different teams use and if they win. 3-PS2-1",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/11470.json"},
    tags: ["ngss-elementary-school"]
  }
];

const middleSchoolResources: Resource[] = [
  {
    slug: "gas-filled-balloons",
    title: "Gas filled balloons (ID#: 034-02-c01)",
    description: "Analyze and interpret patterns in data of four unknown gas samples to determine if any of these gas samples could be the same gas. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5158.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "comparing-types-of-natural-sugars",
    title: "Comparing types of natural sugars (ID#: 006-04-c01)",
    description: "Analyze and interpret patterns in data collected of four natural sources of sugar (honey, milk, sugar cane, and an apple) to determine if any of the sources contain the same type of sugar. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5157.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "matching-unknown-liquids",
    title: "Matching unknown liquids (ID#: 005-04-c01)",
    description: "Analyze and interpret patterns in data of four unknown liquid samples to determine if any of the samples could be the same liquid. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5156.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "andy-comparison-of-metals",
    title: "Andy’s comparison of metals (ID#: 004-03-c01)",
    description: "Analyze and interpret patterns in data to tell Andy whether any four pieces of metal are likely the same metal. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5155.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "masons-coin",
    title: "Mason’s Coin (ID#: 001-03-c01)",
    description: "Analyze and interpret patterns in data of five known metals and one unknown metal (Mason’s Coin) to determine which known metal makes up Mason’s coin. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5147.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "safe-storage-identifying-an-unlabeled-liquid",
    title: "Safe storage: Identifying an unlabeled liquid (ID#: 003-03-c01)",
    description: "Analyze and interpret patterns in data of three known liquids and an unknown liquid to determine the identity of the unknown liquid. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5149.json"},
    tags: ["ngss-middle-school"]
  },
  {
    slug: "teds-four-silvery-metals",
    title: "Ted’s four silvery metals (ID#: 033-02-c01)",
    description: "Analyze and interpret patterns in data of four pieces of unidentified metal to determine if any of the metals are the same metal. MS-PS1-2",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/5148.json"},
    tags: ["ngss-middle-school"]
  }
];

const interactionsResources: Resource[] = [
  {
    slug: "unit-1-inv-1-why-do-some-things-stick-together-and-other-things-dont-v2",
    title: "Unit 1 - Inv. 1: Why do some things stick together and other things don't? (v2)",
    description: "In this investigation, students will develop a conceptual model of electrostatic interactions by exploring how various charged objects (Scotch tape, balloons, rods of various materials, and a Van de Graaff generator) interact with each other and with uncharged objects (paper, water bottle, a hand). By the end of the investigation, the student model will include positive and negative charges as well as patterns that can be used to explain and predict how charged objects interact. This investigation builds toward NGSS PE: HS-PS2-4. Authored by: Kristin Mayer, Jane Lee, Chanyah Dahsah, Freida Reichsman, Shawn Stevens, Leonora Kaldaras, Angela Kolonich, Dan Damelin, Joseph Krajcik",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/304.json"},
    tags: ["interactions"]
  },
  {
    slug: "unit-1-inv-2-what-are-factors-that-affect-the-interactions-between-objects-v2",
    title: "Unit 1 - Inv. 2: What are factors that affect the interactions between objects? (v2)",
    description: "In this investigation, students develop a model of electric fields to explain how charged objects interact. Students analyze how the charge on objects and the distance between them affects the strength of the interactions between those objects. This investigation builds toward NGSS PEs: HS-PS2-4 and HS-PS3-5. Authored by: Kristin Mayer, Jane Lee, Chanyah Dahsah, Freida Reichsman, Shawn Stevens, Leonora Kaldaras, Angela Kolonich, Dan Damelin, Joseph Krajcik",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/305.json"},
    tags: ["interactions"]
  },
  {
    slug: "unit-1-inv-3-what-are-all-materials-made-of-v2",
    title: "Unit 1 - Inv. 3: What are all materials made of? (v2)",
    description: "In this Investigation, students will start by analyzing observations of matter in order to evaluate continuous and particle models of matter. Students will then use evidence from mixing water and ethanol to evaluate those models. Finally, students will apply their model to explain observations of gases. This Investigation builds toward NGSS PE HS-PS1-3. Authored by: Kristin Mayer, Jane Lee, Chanyah Dahsah, Freida Reichsman, Shawn Stevens, Leonora Kaldaras, Angela Kolonich, Dan Damelin, Joseph Krajcik",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/306.json"},
    tags: ["interactions"]
  },
  {
    slug: "unit-1-inv-4-what-are-natures-building-blocks-v2",
    title: "Unit 1 - Inv. 4: What are nature’s building blocks? (v2)",
    description: "This investigation follows the historical development of models of atomic structure and provides students with the opportunity to explore simulations of some of the experiments that led to these models. In addition, through hands-on activities involving representative objects, this investigation helps students gain insight into the size of atoms as compared with other small objects. This investigation helps build toward NGSS PEs: HS-PS1-1 and HS-PS1-3. Authored by: Kristin Mayer, Jane Lee, Chanyah Dahsah, Freida Reichsman, Shawn Stevens, Leonora Kaldaras, Angela Kolonich, Dan Damelin, Joseph Krajcik",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/307.json"},
    tags: ["interactions"]
  },
  {
    slug: "unit-1-inv-5-how-does-an-object-become-charged-v2",
    title: "Unit 1 - Inv. 5: How does an object become charged? (v2)",
    description: "Students will build upon the model of atomic structure that they developed in the previous investigation. In addition, they will explore the forces involved in maintaining an atom’s structure and the effect that introduction into an electric field has on electron distribution. Students will extend their conceptual model of electrostatic interactions to include 1) electron transfer as the mechanism for how an object becomes charged and 2) shifting electron distribution to explain how neutral objects can be attracted to both positively and negatively charged objects. This investigation helps build toward NGSS PE(s): HS-PS1-1 and HS-PS1-3. Authored by: Kristin Mayer, Jane Lee, Chanyah Dahsah, Freida Reichsman, Shawn Stevens, Leonora Kaldaras, Angela Kolonich, Dan Damelin, Joseph Krajcik",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/308.json"},
    tags: ["interactions"]
  }
];

const inquiryspaceResources: Resource[] = [
  {
    slug: "investigation-1-experimentation-in-physics-2021",
    title: "Investigation 1 - Experimentation in physics (2021)",
    description: "Learn the basics of experimentation using sensors and CODAP data analysis software.",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/541.json"},
    tags: ["inquiryspace"]
  },
  {
    slug: "investigation-2-the-kickball-challenge-2021",
    title: "Investigation 2 - The kickball challenge (2021)",
    description: "Deepen experimentation and data analysis skills while learning about velocity.",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/545.json"},
    tags: ["inquiryspace"]
  },
  {
    slug: "investigation-3-independent-experimentation-in-physics-2021",
    title: "Investigation 3 - Independent Experimentation in Physics (2021)",
    description: "This investigation is a scaffold for any phenomenon students might explore after doing Investigations 1 and 2. There are some suggested phenomena in the teacher guide, but you are welcome to choose your own.",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/12013.json"},
    tags: ["inquiryspace"]
  }
]

export const buildingModelsResources: Resource[] = [
  {
    slug: "introduction-to-static-equilibrium-modeling-2-day-2020",
    title: "Introduction to Static Equilibrium Modeling (2 day - 2020)",
    description: "This investigation will introduce students to systems, systems modeling and computational thinking using static equilibrium modeling with SageModeler. This (or the 5-day version of this activity) is a pre-requisite for Introduction to Dynamic Modeling. This 2-day version jumps into student modeling more quickly and relies more heavily on the teacher to scaffold concepts of systems, modeling, and SageModeler.",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/10960.json"},
    tags: ["building-models"]
  },
  {
    slug: "introduction-to-static-equilibrium-modeling-5-day-2020",
    title: "Introduction to Static Equilibrium Modeling (5 day - 2020)",
    description: "This investigation will introduce students to systems, systems modeling and computational thinking using static equilibrium modeling with SageModeler. This (or the 2-day version of this activity) is a pre-requisite for Introduction to Dynamic Modeling. This 5-day version has more scaffolding of the concepts of systems, modeling, and SageModeler built into the student activity, but still requires teacher guidance.",
    tool: {type: "ap", sequence: "https://authoring.concord.org/api/v1/sequences/556.json"},
    tags: ["building-models"]
  },
  {
    slug: "introduction-to-dynamic-modeling-2020",
    title: "Introduction to Dynamic Modeling (2020)",
    description: "This investigation introduces students to system dynamics modeling. It assumes that students have completed Introduction to Static Equilibrium Modeling as a pre-requisite.",
    tool: {type: "ap", activity: "https://authoring.concord.org/api/v1/activities/11036.json"},
    tags: ["building-models"]
  }
];

export const mothEdResources: Resource[] = [
    {
    slug: "clue-it-yourself",
    title: "CLUE-It-Yourself",
    description: "Build your investigation in this open version of MothEd CLUE.",
    tool: {type: "clue", problem: "1.1", unit: "clue-basic"},
    tags: ["moth-ed"]
  }
]

export const allResources: Resource[] = [
  ...devResources,
  ...elementarySchoolResources,
  ...middleSchoolResources,
  ...interactionsResources,
  ...inquiryspaceResources,
  ...buildingModelsResources,
  ...mothEdResources
]

export const findResource = (slug?: string): Resource | undefined => {
  return allResources.find(resource => resource.slug === slug);
}