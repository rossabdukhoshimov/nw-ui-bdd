# Nightwatch v3 UI Test Framework 🚀

![Nightwatch.js](https://img.shields.io/badge/Nightwatch-v3-green)
![Node.js](https://img.shields.io/badge/Node.js-22+-blue)
![Cucumber](https://img.shields.io/badge/Cucumber-BDD-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

## 📌 About the Project
This repository contains a **comprehensive UI Test Automation Framework** built on **Nightwatch.js v3**, following **Cucumber BDD** principles with **Page Object Model**.  
It supports **UI and performance testing**, **accessibility compliance**, and **seamless CI/CD integration** using **GitHub Actions**.  

---

## ✅ Key Features
✔ **Cucumber BDD & Gherkin** – Feature files for better readability and collaboration  
✔ **Page Object Model (POM)** – Clean and maintainable UI test design  
✔ **Accessibility Testing (AXE)** – WCAG & Section 508 compliance validation  
✔ **Multi-Browser Support** – Runs on **Chrome**, **Firefox**, and **Edge**  
✔ **Session Management** – Saves and reuses login sessions for faster test runs  
✔ **Maintenance Tests** – Automatically updates test account passwords and syncs **GitHub Actions secrets**  
✔ **Performance Testing with Artillery** – Cucumber-based performance scenarios  
✔ **Custom Crow Helpers** – In-house generic functions reusable across projects (inspired by GoT Night’s Watch 🐺)  
✔ **Comprehensive GitHub Actions Workflow**:  
   - Parallel test execution with retries  
   - Generates **plain-text summary reports**  
   - Sends **Slack notifications** after UAT deployment, including app version info  
✔ **Automated Dependency Updates** – Weekly scheduled workflow creates PR for outdated dependencies  
✔ **CI/CD Ready** – Runs on pull requests, feature branches, and production pipelines  

---

## 🗂 Project Structure
```
tests/
 ├── pages/               # Page Object files
 ├── step-definitions/    # Step definitions for BDD
 ├── features/            # Cucumber feature files
 ├── utils/               # Utility functions & Crow helpers
 ├── reports/             # Test reports (HTML, JSON, text)
 └── nightwatch.conf.js   # Nightwatch configuration
```

---

## ⚡ Setup & Installation
Clone the repository:
```bash
git clone https://github.com/your-username/nightwatch-ui-framework.git
cd nightwatch-ui-framework
```

Install dependencies:
```bash
npm install
```

---

## 🔐 Environment Configuration
Create a `.env` file in the root:
```
BASE_URL=https://your-app.com
USERNAME=testuser
PASSWORD=yourpassword
```

---

## ▶ Running Tests
Run **all tests**:
```bash
npx nightwatch
```

Run in **specific browser**:
```bash
npx nightwatch --env chrome
npx nightwatch --env firefox
npx nightwatch --env edge
```

Run **specific feature file**:
```bash
npx nightwatch --tag smoke
```

Run **performance tests**:
```bash
npm run performance
```

---

## ♿ Accessibility Testing
Run **Accessibility tests using AXE**:
```bash
npx nightwatch --tag accessibility
```

---

## 🔄 Session Reuse
The framework **caches login sessions** for faster execution.  
Refresh or update session:
```bash
npm run refresh-session
```

---

## 🔧 Maintenance Automation
Update test account passwords and sync to **GitHub Actions secrets**:
```bash
npm run update-passwords
```

---

## ✅ GitHub Actions CI/CD
- **Regression & Smoke tests** run on every PR  
- **Parallel execution with retries** for flake reduction  
- **Slack Notifications** after successful UAT deployment with app version info  
- **Weekly Dependency Update Workflow** creates automated PR for outdated packages  

---

## ✅ Features at a Glance
✔ UI & Accessibility Testing  
✔ Performance Testing with Artillery  
✔ Multi-browser support (Chrome, Firefox, Edge)  
✔ CI/CD integration with Slack alerts  
✔ Automated dependency updates  
✔ Custom Crow helpers for reusability  

---

## 👨‍💻 About Me
Hi! I'm **Khamroz Abdukhoshimov**, a **QA Automation Engineer** with 8+ years of experience in building **UI, API, and performance testing frameworks**.  
I specialize in **BDD frameworks**, **CI/CD pipelines**, and **AI-driven automation strategies**.  
Connect with me:  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://linkedin.com/in/your-profile)  
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/your-username)  

---

## 📜 License
This project is licensed under the **MIT License**.
