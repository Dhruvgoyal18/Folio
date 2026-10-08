/**
 * Hand-checked expectations for the parser corpus (tests/fixtures/resumes.ts).
 * Each fixture says what a careful human would extract; `src/extract/eval.ts` scores the parser
 * against it per field family, so a fix that helps one layout and hurts another shows up.
 * Dates are YYYY-MM (or YYYY for year-only), "present" for ongoing.
 */
export type GoldenEntry = { org: string; role: string; start?: string; end?: string };
export type Golden = {
  name: string;
  email?: string;
  experience: GoldenEntry[];
  education: string[];
  projects?: string[];
  /** bullets expected across experience + projects + competitions */
  bullets?: number;
  /** at least this many skills */
  skillsAtLeast?: number;
};

export const GOLDEN: Record<string, Golden> = {
  dhruvPor: {
    name: "Dhruv Goyal",
    email: "dhruvgoyal990@gmail.com",
    experience: [
      { org: "Zolve Innovations Private Limited", role: "AI Engineer", start: "2025-09", end: "present" },
      { org: "Department of Artificial Intelligence, IIT Kharagpur", role: "Research Intern", start: "2024-08", end: "2024-12" },
      { org: "Rajendra Prasad Hall of Residence", role: "General Secretary Maintenance", start: "2024-07", end: "2025-04" },
    ],
    education: ["Indian Institute of Technology, Kharagpur"],
    projects: ["Multi-Agent Infrastructure & Enterprise AI Systems — Zolve", "Speech Emotion Recognition", "Data Analysis of Retail Sales"],
    bullets: 10,
    skillsAtLeast: 9,
  },
  designerTitleCase: {
    name: "Maya Chen",
    email: "maya.chen@example.com",
    experience: [
      { org: "Lumen Health", role: "Senior Product Designer", start: "2022-03", end: "present" },
      { org: "Northbeam Bank", role: "Product Designer", start: "2019-06", end: "2022-02" },
    ],
    education: ["California College of the Arts"],
    bullets: 3,
    skillsAtLeast: 4,
  },
  nurseNoBullets: {
    name: "Jordan Blake",
    email: "jordan.blake@example.org",
    experience: [
      { org: "St. Mary's Hospital", role: "Charge Nurse", start: "2020-01", end: "present" },
      { org: "Boston Medical Center", role: "Staff Nurse", start: "2017-06", end: "2019-12" },
      { org: "Boston Health Collective", role: "Free Clinic Volunteer", start: "2018", end: "2021" },
    ],
    education: ["Northeastern University"],
    bullets: 4,
  },
  markdown: {
    name: "Sam Rivera",
    email: "sam@example.dev",
    experience: [
      { org: "Stripe-like Payments Co.", role: "Platform Engineer", start: "2021", end: "present" },
      { org: "Startup Inc", role: "Software Engineer", start: "2018", end: "2021" },
    ],
    education: ["University of Toronto"],
    bullets: 3,
    skillsAtLeast: 6,
  },
  studentMinimal: { name: "Priya N.", email: "priya@example.com", experience: [], education: ["Delhi Public School"] },
  noHeadings: { name: "Alex Morgan", email: "alex@morgan.studio", experience: [], education: [] },
  dateFormats: {
    name: "Chris Oduya",
    email: "chris@example.com",
    experience: [
      { org: "Acme Analytics", role: "Data Scientist", start: "2023-09", end: "present" },
      { org: "Beta Bank", role: "Analyst", start: "2020-01", end: "2023-08" },
      { org: "Gamma Labs", role: "Intern", start: "2019", end: "2019" },
    ],
    education: ["University of Nairobi"],
    bullets: 3,
    skillsAtLeast: 5,
  },
  twoColumnMess: {
    name: "Lee Min-Jun",
    email: "lee@example.kr",
    experience: [{ org: "Kakao Corp", role: "Backend Engineer", start: "2019-03", end: "2023-08" }],
    education: ["KAIST"],
    bullets: 1,
    skillsAtLeast: 4,
  },
  unicodeAndEmoji: {
    name: "Zoë Ångström",
    experience: [{ org: "Volvo Cars", role: "Ingenjör", start: "2020", end: "present" }],
    education: ["KTH Royal Institute of Technology"],
    bullets: 1,
    skillsAtLeast: 3,
  },
  publicationsAcademic: {
    name: "Dr. Hana Sato",
    email: "hana.sato@uni.example",
    experience: [
      { org: "Riken Institute", role: "Postdoctoral Fellow", start: "2022-04", end: "present" },
      { org: "University of Tokyo", role: "PhD Researcher", start: "2017", end: "2022" },
    ],
    education: ["University of Tokyo"],
    bullets: 2,
  },
  bulletsOnlyWeird: { name: "Robin", experience: [], education: [] },
  internshipsUnderProjects: {
    name: "Riya Sharma",
    email: "riya@example.com",
    experience: [
      { org: "Hotel Chain Pvt Ltd", role: "Data Analyst Intern", start: "2024-05", end: "2024-07" },
      { org: "Medifio", role: "Machine Learning Intern", start: "2024-06", end: "2024-06" },
      { org: "Heltar", role: "Data Science Intern", start: "2023-12", end: "2024-02" },
    ],
    education: ["Indian Institute of Technology Guwahati"],
    projects: ["Procurement Analytics Vendor Optimization and Inventory Intelligence Platform for Retail Chains"],
    bullets: 7,
    skillsAtLeast: 2,
  },
  germanLebenslauf: {
    name: "Lena Schmidt",
    email: "lena.schmidt@example.de",
    experience: [
      { org: "Siemens AG", role: "Softwareentwicklerin", start: "2021-04", end: "present" },
      { org: "BMW Group", role: "Werkstudentin", start: "2019-10", end: "2021-03" },
    ],
    education: ["Technische Universität München"],
    bullets: 2,
    skillsAtLeast: 4,
  },
  frenchCv: {
    name: "Camille Martin",
    email: "camille.martin@example.fr",
    experience: [
      { org: "Decathlon", role: "Cheffe de projet", start: "2021-09", end: "present" },
      { org: "Capgemini", role: "Consultante", start: "2018", end: "2021" },
    ],
    education: ["Université Paris-Dauphine"],
    bullets: 2,
    skillsAtLeast: 3,
  },
  promotionsSameCompany: {
    name: "Omar Haddad",
    email: "omar@example.com",
    experience: [
      { org: "Google", role: "Senior Software Engineer", start: "2022-01", end: "present" },
      { org: "Google", role: "Software Engineer", start: "2019-07", end: "2021-12" },
    ],
    education: ["Stanford University"],
    bullets: 2,
    skillsAtLeast: 4,
  },
  datesFirstAndAtSign: {
    name: "Nina Okafor",
    email: "nina@example.com",
    experience: [
      { org: "Glow Cosmetics", role: "Marketing Manager", start: "2020", end: "2023" },
      { org: "Brightside Agency", role: "Social Media Lead", start: "2017", end: "2020" },
    ],
    education: ["University of Lagos"],
    bullets: 2,
    skillsAtLeast: 4,
  },
};
