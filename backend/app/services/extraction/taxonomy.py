"""Comprehensive skill taxonomy with category mapping + alias normalization.

Used for high-recall skill detection. Combines exact match, alias resolution,
and fuzzy matching to handle variants (e.g., "Postgres" → "PostgreSQL").
"""
from __future__ import annotations

SKILL_TAXONOMY: dict[str, list[str]] = {
    "Programming Languages": [
        "Python", "Java", "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Perl",
        "Scala", "Kotlin", "Swift", "TypeScript", "JavaScript", "R", "MATLAB",
        "Objective-C", "Dart", "Shell", "Bash", "PowerShell", "Lua", "Julia",
    ],
    "Frontend & UI": [
        "React", "Next.js", "Vue", "Angular", "Svelte", "Bootstrap", "Tailwind",
        "Material UI", "HTML", "CSS", "SASS", "LESS", "jQuery", "Figma",
        "Adobe XD", "Responsive Design", "UI/UX", "Redux", "Zustand", "Vite", "Webpack",
    ],
    "Backend & API": [
        "Node.js", "Express", "NestJS", "FastAPI", "Flask", "Django", "Spring",
        "Spring Boot", ".NET", "ASP.NET", "Koa", "Laravel", "Ruby on Rails", "Gin",
        "Fiber", "Micronaut", "GraphQL", "REST", "gRPC", "WebSocket", "Tornado",
    ],
    "Mobile & Cross-Platform": [
        "React Native", "Flutter", "SwiftUI", "Android", "iOS", "Xamarin",
        "Ionic", "Cordova", "Jetpack Compose",
    ],
    "Databases": [
        "MySQL", "PostgreSQL", "SQLite", "SQL Server", "Oracle", "MongoDB",
        "Redis", "Cassandra", "CouchDB", "DynamoDB", "Elasticsearch", "Firestore",
        "Neo4j", "Snowflake", "BigQuery", "Athena", "InfluxDB", "Redshift",
        "Pinecone", "Weaviate", "Milvus", "Qdrant", "Chroma", "pgvector",
    ],
    "Cloud & DevOps": [
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
        "Puppet", "Chef", "CloudFormation", "Serverless", "Lambda", "EKS", "AKS",
        "GKE", "CI/CD", "GitHub Actions", "GitLab CI", "CircleCI", "Jenkins",
        "ArgoCD", "Helm", "Istio", "Linkerd", "Prometheus", "Grafana", "Datadog",
        "Splunk", "New Relic", "Networking", "Pulumi", "Crossplane",
    ],
    "Machine Learning & AI": [
        "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "XGBoost", "LightGBM",
        "CatBoost", "BERT", "GPT", "LLM", "LangChain", "LlamaIndex", "RAG",
        "Transformers", "OpenAI", "Hugging Face", "MLflow", "Kubeflow",
        "Weights & Biases", "Deep Learning", "Computer Vision", "NLP", "OCR",
        "Recommendation Systems", "Speech Recognition", "Feature Engineering",
        "Bedrock", "SageMaker", "Vertex AI", "Fine-tuning", "Prompt Engineering",
        "Vector Search", "Embeddings", "Diffusion Models", "Stable Diffusion",
        "Reinforcement Learning", "MLOps", "Model Serving", "Triton",
    ],
    "Data Engineering": [
        "Hadoop", "Spark", "PySpark", "Flink", "Kafka", "Airflow", "NiFi",
        "Databricks", "ETL", "ELT", "Data Pipeline", "Data Lake", "Data Warehouse",
        "Streaming", "Batch Processing", "dbt", "Dagster", "Prefect",
    ],
    "Analytics & BI": [
        "Tableau", "Power BI", "Looker", "Excel", "Google Sheets", "QuickSight",
        "Matplotlib", "Seaborn", "Plotly", "Statistics", "Regression",
        "Forecasting", "A/B Testing",
    ],
    "Testing & QA": [
        "Selenium", "Cypress", "Jest", "Mocha", "PyTest", "JUnit", "TestNG",
        "Postman", "Cucumber", "Playwright", "Appium", "JMeter", "Locust",
    ],
    "Security & Infra": [
        "OAuth", "JWT", "SAML", "OpenID", "Keycloak", "Okta",
        "Penetration Testing", "Vulnerability Scanning", "Encryption", "Firewall",
        "TLS", "SSL", "OWASP", "Zero Trust", "SOC 2", "HIPAA", "GDPR",
    ],
    "Version Control & PM": [
        "Git", "GitHub", "GitLab", "Bitbucket", "SVN", "Mercurial", "JIRA",
        "Confluence", "Trello", "Asana", "Slack", "MS Teams", "Agile", "Scrum",
        "Kanban", "Linear", "Notion",
    ],
    "Automation & RPA": [
        "UIPath", "Automation Anywhere", "Blue Prism", "Power Automate",
        "Zapier", "Workato",
    ],
    "Operating Systems": [
        "Linux", "Ubuntu", "CentOS", "Red Hat", "Windows", "macOS",
    ],
}

# Aliases → canonical skill name. Lowercased.
ALIASES: dict[str, str] = {
    "postgres": "PostgreSQL",
    "psql": "PostgreSQL",
    "py": "Python",
    "py3": "Python",
    "js": "JavaScript",
    "ts": "TypeScript",
    "nodejs": "Node.js",
    "node": "Node.js",
    "next": "Next.js",
    "k8s": "Kubernetes",
    "tf": "Terraform",
    "gh actions": "GitHub Actions",
    "gha": "GitHub Actions",
    "tensorflow 2": "TensorFlow",
    "tf2": "TensorFlow",
    "scikit": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "hf": "Hugging Face",
    "huggingface": "Hugging Face",
    "openai api": "OpenAI",
    "chatgpt": "OpenAI",
    "gpt-4": "GPT",
    "gpt-3.5": "GPT",
    "claude": "LLM",
    "llms": "LLM",
    "large language model": "LLM",
    "large language models": "LLM",
    "retrieval augmented generation": "RAG",
    "retrieval-augmented generation": "RAG",
    "natural language processing": "NLP",
    "computer vision": "Computer Vision",
    "cv": "Computer Vision",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "ai": "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    "amazon web services": "AWS",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "microsoft azure": "Azure",
    "ms sql": "SQL Server",
    "mssql": "SQL Server",
    "mongo": "MongoDB",
    "elastic": "Elasticsearch",
    "es": "Elasticsearch",
    ".net core": ".NET",
    "dotnet": ".NET",
    "c-sharp": "C#",
    "csharp": "C#",
    "golang": "Go",
    "rust lang": "Rust",
    "type script": "TypeScript",
    "java script": "JavaScript",
    "rest api": "REST",
    "restful": "REST",
    "graph ql": "GraphQL",
    "grpc": "gRPC",
    "ml ops": "MLOps",
    "mlops": "MLOps",
    "ci cd": "CI/CD",
    "cicd": "CI/CD",
    "github action": "GitHub Actions",
}

ALL_SKILLS: list[str] = sorted({s for skills in SKILL_TAXONOMY.values() for s in skills})

# Reverse map: skill → category
SKILL_TO_CATEGORY: dict[str, str] = {
    skill: category for category, skills in SKILL_TAXONOMY.items() for skill in skills
}
