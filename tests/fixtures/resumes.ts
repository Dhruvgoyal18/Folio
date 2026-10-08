/**
 * A corpus of résumé layouts the parser has to survive. Each is the kind of text PDF.js / mammoth
 * produce (tabs mark wide gaps). Names and details are fictional, except `dhruvPor`, which mirrors
 * the structure of a real upload that used to fail (positions of responsibility + coursework).
 */
export const CORPUS: Record<string, string> = {
  dhruvPor: `Dhruv Goyal
Phone: +91 9664134435 | Email: dhruvgoyal990@gmail.com | LinkedIn | GitHub
EDUCATION
Indian Institute of Technology, Kharagpur\tDec 2021 – Jun 2025
B.Tech in Civil Engineering
EXPERIENCE
Zolve Innovations Private Limited\tSept 2025 – Present, Full-time
AI Engineer
Multi-Agent Infrastructure & Enterprise AI Systems
• Built a 4-stage NLP-to-SQL pipeline on Presto/Trino using RAG over 5K+ query logs, improving SQL accuracy from 68% to 87%
• Built LangGraph-based multi-agent framework supporting 20+ configurable workflows, tool routing & agent state management
AI-Powered User Acquisition Systems
• Built scraping pipeline on LinkedIn, MyVisaJobs, Yocket via API reverse-engineering & Selenium, aggregating 400k+ potential leads
Department of Artificial Intelligence, IIT Kharagpur\tAug 2024 – Dec 2024, Internship
Research Intern
• Fine-tuned RoBERTa to score data persuasiveness & improved scam detection across highly persuasive synthetic v2 by 65%
PROJECTS
Multi-Agent Infrastructure & Enterprise AI Systems — Zolve
• Engineered MCP client layer with stdio/SSE transports, connection pooling & session recovery, achieving 95%+ workflow reliability
Speech Emotion Recognition
• Classified 8 emotions from audio with Librosa features and a CNN, reaching 72% accuracy
Data Analysis of Retail Sales
• Performed time series decomposition and ARIMA forecasting on 3 years of sales data
POSITIONS OF RESPONSIBILITY
General Secretary Maintenance | Rajendra Prasad Hall of Residence | IIT Kharagpur [Jul '24 - Apr '25]
• Managed administrative affairs and student welfare for 850+ boarders as an active member of the executive 13-member Hall Council
• Led a 300-member team for Illumination 2024, securing 2nd place out of 22 participating halls in IIT Kharagpur's largest cultural event
• Achieved over 20% reduction in the hall's total budget of INR 0.9 Million through strategic financial planning and resource allocation
COURSEWORK INFORMATION
Academic Courses: Probability and Statistics | Advanced Calculus | Linear Algebra, Numerical and Complex Analysis | Electrical Technology |
Basic Electronics | Safety Engineering and Management | Computational Chemistry | Programming and Data Structures (theory and lab)
MOOCs: Data Structures and Algorithms | Data Science Mentorship Program | Data Analysis with Pandas and Python
SKILLS
Programming Languages: C, C++, Python, SQL
Libraries & Frameworks: Numpy, Pandas, LangChain, LangGraph, Selenium`,

  designerTitleCase: `Maya Chen
Senior Product Designer
maya.chen@example.com | Oakland, CA
Work Experience
Senior Product Designer at Lumen Health\tMar 2022 – Present
- Led the redesign of the patient intake flow, cutting average completion time from 14 to 6 minutes
- Built the design system with 120+ components
Product Designer, Northbeam Bank\t06/2019 – 02/2022
- Designed onboarding that reached 250k+ customers
Education
California College of the Arts — BFA Interaction Design\t2013 – 2017
Skills
Figma · Prototyping · User Research · Typography`,

  nurseNoBullets: `JORDAN BLAKE, RN
Registered Nurse
jordan.blake@example.org
(555) 010-2234
PROFESSIONAL SUMMARY
Compassionate registered nurse with 6 years of acute-care experience.
CLINICAL EXPERIENCE
St. Mary's Hospital – Boston, MA
Charge Nurse\tJan 2020 – Present
Supervised a 12-bed cardiac step-down unit and precepted 15 new graduate nurses.
Reduced patient falls on the unit by 30% through hourly rounding.
Boston Medical Center
Staff Nurse\tJun 2017 – Dec 2019
Provided care for post-surgical patients in a 30-bed unit.
EDUCATION
Bachelor of Science in Nursing
Northeastern University, 2017
LICENSES & CERTIFICATIONS
Registered Nurse, Massachusetts
BLS and ACLS certified
VOLUNTEER EXPERIENCE
Free Clinic Volunteer | Boston Health Collective\t2018 – 2021
• Ran weekly blood-pressure screenings for 40+ community members`,

  markdown: `# Sam Rivera
**Backend Engineer** · sam@example.dev · github.com/samrivera

## Experience
### Platform Engineer — Stripe-like Payments Co.
2021 - present
* Cut p99 API latency by 45% by moving hot paths to Go
* Owned the Kafka event bus processing 2M+ events/day

### Software Engineer — Startup Inc
2018 - 2021
* Built the billing service in Python and PostgreSQL

## Education
University of Toronto, BSc Computer Science, 2014 - 2018

## Skills
Go, Python, PostgreSQL, Kafka, Kubernetes, AWS`,

  studentMinimal: `Priya N.
priya@example.com
Education
Delhi Public School\t2010 – 2022
Class XII, CBSE — 96.4%
Achievements
• Gold medal, National Science Olympiad 2021
• School debate captain`,

  noHeadings: `Alex Morgan
Freelance illustrator and animator based in Lisbon.
alex@morgan.studio
I make editorial illustrations for magazines and short animated loops for brands.
Clients include The Atlantic, Wired and Spotify.`,

  dateFormats: `Chris Oduya
chris@example.com
Experience
Data Scientist | Acme Analytics | Nairobi\t(Sep. 2023 – Current)
• Built churn models in XGBoost improving recall by 12 points
Analyst — Beta Bank\tJanuary 2020 to August 2023
• Automated 30+ weekly reports with SQL and Tableau
Intern, Gamma Labs\tSummer 2019
• Cleaned survey data in R
Education
University of Nairobi\t2016 - 2020
BSc Statistics
Skills
Python; R; SQL; Tableau; XGBoost`,

  twoColumnMess: `LEE MIN-JUN\tSEOUL, KOREA
SOFTWARE ENGINEER\tlee@example.kr
EXPERIENCE\tSKILLS
Kakao Corp\tJava, Kotlin, Spring
Backend Engineer 2019.03 – 2023.08\tKafka
• Designed a notification system for 50M users
EDUCATION
KAIST 2015 - 2019
B.S. Computer Science`,

  unicodeAndEmoji: `Zoë Ångström 🚀
✉ zoe@例え.jp | 📍 Malmö
Erfarenhet
Experience
Ingenjör på Volvo Cars\t2020 – nu
• Förbättrade testtäckningen med 40%
Education
KTH Royal Institute of Technology\t2015 – 2020
MSc Mechatronics
Skills
C++, ROS, MATLAB`,

  longAndRepetitive: `Pat Example
pat@example.com
Experience
${Array.from({ length: 14 }, (_, i) => `Company ${i + 1} Holdings Private Limited Technologies Solutions Group of Companies International\tJan ${2000 + i} – Dec ${2000 + i}\nSenior Principal Staff Engineer and Architect of Everything Important ${i}\n• Did thing number ${i} that improved metric ${i} by ${i + 3}% for ${i + 1}0k+ users across ${i + 2} regions`).join("\n")}
Education
The University of Very Long Names and Even Longer Descriptions of Academic Programmes\t1996 – 2000
Bachelor of Science in Many Subjects`,

  publicationsAcademic: `Dr. Hana Sato
Postdoctoral Researcher, Computational Biology
hana.sato@uni.example
Research Experience
Postdoctoral Fellow | Riken Institute | Tokyo\tApr 2022 – Present
• Developed single-cell RNA-seq pipelines processing 1.2M cells
PhD Researcher, University of Tokyo\t2017 – 2022
• Thesis on protein folding dynamics
Publications
Sato H., et al. (2023). "Folding landscapes". Nature Methods.
Teaching
Teaching Assistant, Molecular Biology 101
Education
Ph.D. Biology, University of Tokyo, 2022
Languages
Japanese (native), English (fluent)`,

  bulletsOnlyWeird: `• • •
Name: Robin
---
EXPERIENCE:
- did stuff
-
Education:
??
Skills:
,,,,`,

  internshipsUnderProjects: `Riya Sharma
riya@example.com | +91 98765 43210
EDUCATION
Indian Institute of Technology Guwahati\t2021 – 2025
B.Tech in Chemical Engineering
INTERNSHIPS & PROJECTS
Data Analyst Intern | Hotel Chain Pvt Ltd\t[ May'24 – Jul'24 ]
• Analyzed booking patterns across 5 market segments and seasonal trends providing strategic recommendations for retention programs
Machine Learning Intern | Medifio | BioNEST IIT Guwahati\t[ Jun'24 ]
• Fine-tuned BioBERT on a medical corpus achieving 92% validation accuracy
Procurement Analytics Vendor Optimization and Inventory Intelligence Platform for Retail Chains
• Optimized SQL ETL pipeline with CTEs to create aggregated 50K+ vendor data for profitability, pricing strategies, and inventory analysis
• Flagged $2.71M unsold inventory and quantified 72% per-unit savings from bulk orders, driving a 25% improvement in turnover efficiency
• Applied hypothesis testing with 95% CI, validating 12.83% savings vs (3117% outliers)
• Built dashboards in Power BI
Data Science Intern | Heltar\t[ Dec'23 – Feb'24 ]
• Built churn prediction models in XGBoost improving recall by 18%
SKILLS
Languages: Python, SQL`,

  germanLebenslauf: `Lena Schmidt
lena.schmidt@example.de | München
BERUFSERFAHRUNG
Softwareentwicklerin bei Siemens AG\t04/2021 – heute
• Entwicklung einer Testplattform, die die Laufzeit der Regressionstests um 35% verkürzte
Werkstudentin bei BMW Group\t10/2019 – 03/2021
• Datenanalyse mit Python und SQL
AUSBILDUNG
Technische Universität München\t2016 – 2021
M.Sc. Informatik
KENNTNISSE
Python, Java, SQL, Docker`,

  frenchCv: `Camille Martin
camille.martin@example.fr
Expérience professionnelle
Cheffe de projet chez Decathlon\tSept 2021 – présent
• Pilotage de 12 lancements produits par an
Consultante chez Capgemini\t2018 – 2021
• Accompagnement de 8 clients du secteur bancaire
Formation
Université Paris-Dauphine\t2013 – 2018
Master Management
Compétences
Gestion de projet, SQL, Power BI`,

  promotionsSameCompany: `Omar Haddad
omar@example.com
Experience
Google
Senior Software Engineer\tJan 2022 – Present
• Led the migration of search indexing to a streaming pipeline, cutting freshness lag from 6 hours to 15 minutes
Software Engineer\tJul 2019 – Dec 2021
• Built ranking experiments framework used by 40+ teams
Education
Stanford University\t2015 – 2019
BS Computer Science
Skills
Go, C++, Python, Spanner`,

  datesFirstAndAtSign: `Nina Okafor
nina@example.com
WORK HISTORY
2020 – 2023\tMarketing Manager @ Glow Cosmetics
• Grew organic social following from 12k to 180k
2017 – 2020\tSocial Media Lead @ Brightside Agency
• Ran campaigns for 25 consumer brands
EDUCATION
2013 – 2017\tUniversity of Lagos
BA Mass Communication
SKILLS
SEO, Content strategy, Meta Ads, Canva`,
};
