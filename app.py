%%writefile app.py
from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import fitz, re, json

# ==============================================================
# 1. APP SETUP
# ==============================================================
app = FastAPI(title="AI Resume Analyzer", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================
#  2. UNIVERSAL SKILL TAXONOMY
# ==============================================================
skill_taxonomy = {
    "Programming Languages": [
        "Python","Java","C","C++","C#","Go","Rust","Ruby","PHP","Perl",
        "Scala","Kotlin","Swift","TypeScript","JavaScript","R","MATLAB",
        "Objective-C","Dart","Shell","Bash","PowerShell"
    ],
    "Frontend & UI": [
        "React","Next.js","Vue","Angular","Svelte","Bootstrap","Tailwind","Material UI",
        "HTML","CSS","SASS","LESS","jQuery","Figma","Adobe XD","Responsive Design","UI/UX"
    ],
    "Backend & API": [
        "Node.js","Express","NestJS","FastAPI","Flask","Django","Spring","Spring Boot",
        ".NET","ASP.NET","Koa","Laravel","Ruby on Rails","Gin","Fiber","Micronaut",
        "GraphQL","REST","gRPC"
    ],
    "Mobile & Cross-Platform": [
        "React Native","Flutter","SwiftUI","Android","iOS","Xamarin","Ionic","Cordova"
    ],
    "Databases": [
        "MySQL","PostgreSQL","SQLite","SQL Server","Oracle","MongoDB","Redis",
        "Cassandra","CouchDB","DynamoDB","Elasticsearch","Firestore","Neo4j",
        "Snowflake","BigQuery","Athena","InfluxDB","Redshift"
    ],
    "Cloud & DevOps": [
        "AWS","Azure","GCP","Docker","Kubernetes","Terraform","Ansible",
        "Puppet","Chef","CloudFormation","Serverless","Lambda","EKS","AKS","GKE",
        "CI/CD","GitHub Actions","GitLab CI","CircleCI","Jenkins","ArgoCD",
        "Prometheus","Grafana","Datadog","Splunk","New Relic","Networking"
    ],
    "Machine Learning & AI": [
        "TensorFlow","PyTorch","Scikit-learn","Keras","XGBoost","LightGBM","CatBoost",
        "BERT","GPT","LLM","LangChain","RAG","Transformers","OpenAI","Hugging Face",
        "MLflow","Kubeflow","Weights & Biases","Deep Learning","Computer Vision",
        "NLP","OCR","Recommendation Systems","Speech Recognition","Feature Engineering"
    ],
    "Data Engineering": [
        "Hadoop","Spark","PySpark","Flink","Kafka","Airflow","NiFi","Databricks",
        "ETL","Data Pipeline","Data Lake","Data Warehouse","Streaming","Batch Processing"
    ],
    "Analytics & BI": [
        "Tableau","Power BI","Looker","Excel","Google Sheets","QuickSight",
        "Matplotlib","Seaborn","Plotly","Statistics","Regression","Forecasting"
    ],
    "Testing & QA": [
        "Selenium","Cypress","Jest","Mocha","PyTest","JUnit","TestNG",
        "Postman","Cucumber","Playwright","Appium","JMeter"
    ],
    "Security & Infra": [
        "OAuth","JWT","SAML","OpenID","Keycloak","Okta","Penetration Testing",
        "Vulnerability Scanning","Encryption","Firewall","TLS","SSL","OWASP","Zero Trust"
    ],
    "Version Control & PM": [
        "Git","GitHub","GitLab","Bitbucket","SVN","Mercurial",
        "JIRA","Confluence","Trello","Asana","Slack","MS Teams","Agile","Scrum","Kanban"
    ],
    "Automation & RPA": [
        "UIPath","Automation Anywhere","Blue Prism","Power Automate","Zapier","Workato"
    ],
    "Operating Systems": [
        "Linux","Ubuntu","CentOS","Red Hat","Windows","macOS"
    ]
}

ALL_SKILLS = sorted(set(sum(skill_taxonomy.values(), [])))

# ==============================================================
#  3. HELPERS
# ==============================================================
def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[\/\-–—_]+", " ", text)
    text = re.sub(r"[^a-z0-9+#\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_skills(text: str):
    text = normalize(text)
    found = set()
    for skill in ALL_SKILLS:
        safe = re.escape(skill.lower())
        if re.search(rf"(?<!\w){safe}(?!\w)", text):
            found.add(skill)
    return found

def extract_text_from_pdf(file_bytes):
    text = ""
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    for page in pdf:
        text += page.get_text("text")
    return text

# ==============================================================
#  4. API ROUTES
# ==============================================================
@app.get("/")
def home():
    return {"message": "AI Resume Analyzer backend (v2.0) is live!"}

@app.post("/analyze")
async def analyze_resume(file: UploadFile, job_description: str = Form(...)):
    pdf_bytes = await file.read()
    resume_text = extract_text_from_pdf(pdf_bytes)
    jd_text = normalize(job_description)

    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(jd_text)

    matched = sorted(resume_skills & jd_skills)
    missing = sorted(jd_skills - resume_skills)
    score = round((len(matched) / len(jd_skills) * 100), 2) if jd_skills else 0

    return {
        "resume_skill_count": len(resume_skills),
        "jd_skill_count": len(jd_skills),
        "matched_skills": matched,
        "missing_skills": missing,
        "match_score": score
    }
