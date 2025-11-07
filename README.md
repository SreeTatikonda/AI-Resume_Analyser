# AI Resume Analyzer

The AI Resume Analyzer is a smart web app that helps you compare your resume against any job description.  
It automatically extracts skills from your resume and highlights the skills mentioned in the job post, giving you a match score and detailed feedback.

---

## What this project does

- Upload your resume in PDF format  
- Paste any job description  
- The backend extracts technical keywords and compares both  
- You get:
  - Total matched skills  
  - Missing skills  
  - Overall match percentage  
- All processed live using FastAPI and PyMuPDF in a Colab-powered backend

---

##  How it works (simple breakdown)

1. **Frontend (index.html):**  
   A clean, modern web interface built using HTML, CSS, and JavaScript.
   - Lets users upload resumes and paste job descriptions  
   - Sends data to the FastAPI backend  
   - Displays results dynamically (match score, skills)

2. **Backend (app.py):**  
   A Python FastAPI app that:
   - Reads PDF text using PyMuPDF  
   - Extracts and normalizes skills using a massive universal taxonomy  
   - Compares resume vs job description  
   - Returns a JSON report

3. **ngrok Tunnel:**  
   Used to expose your backend publicly when running from Google Colab.

---

## ⚙️ Setup and Run Guide

### Clone this repository
```bash
git clone https://github.com/yourusername/AI-Resume-Analyzer.git
cd AI-Resume-Analyzer
