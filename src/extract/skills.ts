/**
 * Skill vocabulary used to (a) classify listed skills into domains and (b) spot skills that a
 * bullet names but the Skills section doesn't list ("named in a bullet"). Matching is
 * whole-word and case-aware for short names, so "C" never matches "C-suite".
 */

export const GENERIC_DOMAINS = {
  languages: "Programming languages",
  "ai-ml": "AI & machine learning",
  frameworks: "Frameworks & libraries",
  data: "Data & analytics",
  "cloud-devops": "Cloud & DevOps",
  design: "Design & creative",
  "product-business": "Product & business",
  tools: "Tools & platforms",
  other: "Other skills",
} as const;
export type GenericDomain = keyof typeof GENERIC_DOMAINS;

type Entry = [name: string, domain: GenericDomain, aliases?: string[]];

const VOCAB: Entry[] = [
  // languages
  ["Python", "languages"], ["JavaScript", "languages", ["JS"]], ["TypeScript", "languages", ["TS"]], ["Java", "languages"], ["C++", "languages", ["CPP"]],
  ["C#", "languages"], ["C", "languages"], ["Go", "languages", ["Golang"]], ["Rust", "languages"], ["Kotlin", "languages"], ["Swift", "languages"],
  ["Ruby", "languages"], ["PHP", "languages"], ["R", "languages"], ["Scala", "languages"], ["SQL", "languages"], ["Bash", "languages", ["Shell"]],
  ["MATLAB", "tools", ["MATLAB/Simulink", "Simulink"]], ["Dart", "languages"], ["Julia", "languages"], ["HTML", "languages"], ["CSS", "languages"],
  // AI / ML
  ["TensorFlow", "ai-ml"], ["PyTorch", "ai-ml"], ["Keras", "ai-ml"], ["Scikit-Learn", "ai-ml", ["sklearn", "scikit learn"]], ["XGBoost", "ai-ml"],
  ["LightGBM", "ai-ml"], ["Hugging Face", "ai-ml", ["HuggingFace", "Transformers"]], ["LangChain", "ai-ml"], ["LangGraph", "ai-ml"], ["LlamaIndex", "ai-ml"],
  ["CrewAI", "ai-ml"], ["OpenAI", "ai-ml"], ["GPT", "ai-ml", ["GPT-4", "GPT-3.5", "GPT-3.5-turbo"]], ["Claude", "ai-ml"], ["BERT", "ai-ml"], ["RoBERTa", "ai-ml"],
  ["Llama", "ai-ml", ["Llama-3", "Llama-3.1"]], ["RAG", "ai-ml"], ["LLM", "ai-ml", ["LLMs"]], ["NLP", "ai-ml"], ["Computer Vision", "ai-ml"], ["OpenCV", "ai-ml"],
  ["YOLO", "ai-ml", ["Ultralytics"]], ["spaCy", "ai-ml"], ["NLTK", "ai-ml"], ["CNN", "ai-ml"], ["LSTM", "ai-ml"], ["Transformer", "ai-ml"],
  ["Reinforcement Learning", "ai-ml"], ["MLflow", "ai-ml"], ["FAISS", "ai-ml"], ["Pinecone", "ai-ml"], ["ChromaDB", "ai-ml", ["Chroma"]], ["Weaviate", "ai-ml"],
  ["MCP", "ai-ml", ["MCP Servers", "Model Context Protocol"]], ["SHAP", "ai-ml"], ["Librosa", "ai-ml"],
  // frameworks
  ["React", "frameworks", ["React.js", "ReactJS"]], ["Next.js", "frameworks", ["NextJS"]], ["Vue", "frameworks", ["Vue.js"]], ["Angular", "frameworks"],
  ["Svelte", "frameworks"], ["Node.js", "frameworks", ["Node", "NodeJS"]], ["Express", "frameworks"], ["Django", "frameworks"], ["Flask", "frameworks"],
  ["FastAPI", "frameworks"], ["Spring", "frameworks", ["Spring Boot"]], ["Rails", "frameworks", ["Ruby on Rails"]], ["Tailwind", "frameworks", ["Tailwind CSS"]],
  ["GraphQL", "frameworks"], ["React Native", "frameworks"], ["Flutter", "frameworks"], ["NumPy", "frameworks", ["Numpy"]], ["Pandas", "frameworks"],
  ["SciPy", "frameworks"], ["Matplotlib", "frameworks"], ["Seaborn", "frameworks"], ["Selenium", "frameworks"], ["Playwright", "frameworks"],
  ["SQLAlchemy", "frameworks"], ["Three.js", "frameworks"], ["D3", "frameworks", ["D3.js"]], ["FastMCP", "frameworks"],
  // data
  ["PostgreSQL", "data", ["Postgres"]], ["MySQL", "data"], ["MongoDB", "data"], ["Redis", "data"], ["Kafka", "data", ["Apache Kafka"]],
  ["Spark", "data", ["Apache Spark", "PySpark"]], ["Airflow", "data", ["Apache Airflow"]], ["dbt", "data"], ["Snowflake", "data"], ["BigQuery", "data"],
  ["Presto", "data", ["Trino", "Presto/Trino"]], ["Tableau", "data"], ["Power BI", "data", ["PowerBI"]], ["Looker", "data"], ["Excel", "data"],
  ["Elasticsearch", "data"], ["DynamoDB", "data"], ["Hadoop", "data"], ["ETL", "data"], ["A/B testing", "data", ["AB testing"]],
  // cloud / devops
  ["AWS", "cloud-devops", ["Amazon Web Services"]], ["GCP", "cloud-devops", ["Google Cloud"]], ["Azure", "cloud-devops"], ["Docker", "cloud-devops"],
  ["Kubernetes", "cloud-devops", ["K8s"]], ["Terraform", "cloud-devops"], ["CI/CD", "cloud-devops"], ["GitHub Actions", "cloud-devops"], ["Linux", "cloud-devops"],
  ["Cloudflare", "cloud-devops"], ["Vercel", "cloud-devops"], ["Nginx", "cloud-devops"], ["Modal", "cloud-devops"], ["OAuth", "cloud-devops"],
  // design
  ["Figma", "design"], ["Sketch", "design"], ["Adobe XD", "design"], ["Photoshop", "design"], ["Illustrator", "design"], ["InDesign", "design"],
  ["After Effects", "design"], ["Blender", "design"], ["Framer", "design"], ["Webflow", "design"], ["Prototyping", "design"], ["User Research", "design"],
  ["Design Systems", "design"], ["Typography", "design"], ["Motion Design", "design"], ["Wireframing", "design"],
  // product / business
  ["Product Management", "product-business"], ["Roadmapping", "product-business"], ["Agile", "product-business", ["Scrum"]], ["JIRA", "tools", ["Jira"]],
  ["SEO", "product-business"], ["Google Analytics", "product-business"], ["Salesforce", "product-business"], ["HubSpot", "product-business"],
  ["Financial Modeling", "product-business"], ["Stakeholder Management", "product-business"], ["Go-to-market", "product-business", ["GTM"]],
  // tools
  ["Git", "tools"], ["GitHub", "tools"], ["GitLab", "tools"], ["Jupyter", "tools"], ["VS Code", "tools"], ["Postman", "tools"], ["Notion", "tools"],
  ["ROS", "tools"], ["Slack", "tools"], ["Google Sheets", "tools", ["Google Sheets API"]],
];

type Hit = { name: string; domain: GenericDomain };
const ENTRIES = VOCAB.map(([name, domain, aliases = []]) => ({ name, domain, forms: [name, ...aliases] }));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word matcher; ≤2-char names (C, R, Go) must match case-sensitively and not touch '-', '&' or '/'. */
function matcher(form: string): RegExp {
  const short = form.replace(/[^a-z]/gi, "").length <= 2;
  if (short) return new RegExp(`(?<![\\w+#.&-])${escapeRe(form)}(?![\\w+#&-]|/\\w)`);
  return new RegExp(`(?<![\\w+#])${escapeRe(form)}(?![\\w+#])`, "i");
}
const MATCHERS = ENTRIES.map((e) => ({ ...e, res: e.forms.map(matcher) }));

export function classifySkill(name: string): Hit | null {
  const n = name.trim().toLowerCase();
  for (const e of ENTRIES) if (e.forms.some((f) => f.toLowerCase() === n)) return { name: e.name, domain: e.domain };
  return null;
}

/** Vocabulary skills named in a sentence. */
export function skillsInText(text: string): Hit[] {
  const out: Hit[] = [];
  for (const e of MATCHERS) if (e.res.some((re) => re.test(text))) out.push({ name: e.name, domain: e.domain });
  return out;
}

/** Does `text` mention the skill called `name` (whole word)? */
export function mentions(text: string, name: string): boolean {
  const known = ENTRIES.find((e) => e.forms.some((f) => f.toLowerCase() === name.toLowerCase()));
  const forms = known ? known.forms : [name];
  return forms.some((f) => matcher(f).test(text));
}

/** Map a resume's own skill-group heading to a generic domain, when it clearly names one. */
export function domainFromGroup(group: string | undefined): GenericDomain | null {
  if (!group) return null;
  const g = group.toLowerCase();
  if (/language/.test(g)) return "languages";
  if (/framework|librar/.test(g)) return "frameworks";
  if (/\b(ai|ml|machine learning|deep learning|nlp|llm)\b/.test(g)) return "ai-ml";
  if (/data|analytic|database/.test(g)) return "data";
  if (/cloud|devops|infra/.test(g)) return "cloud-devops";
  if (/design|creative/.test(g)) return "design";
  if (/business|product|management|marketing|finance/.test(g)) return "product-business";
  if (/tool|software|platform/.test(g)) return "tools";
  return null;
}
