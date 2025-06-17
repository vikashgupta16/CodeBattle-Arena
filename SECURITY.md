# 🔐 Security Policy

## 📅 Supported Versions

We actively maintain and patch the following versions:

| Version         | Supported          |
|----------------|--------------------|
| `main` branch  | ✅ Yes (active dev) |
| Older releases | ❌ No               |

---

## 🛡️ Reporting a Vulnerability

If you find a **security vulnerability** in CodeBattle Arena (e.g., XSS, SQL/NoSQL Injection, data exposure, authentication flaws):

- **DO NOT** open a public GitHub issue.
- **INSTEAD**, please report it **privately** via:

📧 Email: `alpha4codersy@gmmail.com`  
🛠️ GitHub Security Advisories (preferred): [Report here](https://github.com/vikashgupta16/CodeBattle-Arena/security/advisories)

We will respond within **48 hours** and work to release a patch ASAP.

---

## 🔐 Security Practices Followed

CodeBattle Arena is designed with the following security principles:

- **Input Validation** on all user inputs (frontend and backend)
- **Rate Limiting** to prevent brute-force attacks
- **CORS & Helmet Middleware** enabled for API protection
- **JWT Authentication & Role-based Access Control**
- **Socket.io namespaces** for real-time battle sessions
- **Environment-based secrets handling** using `.env`
- **User Data Encryption** where necessary (e.g., hashed credentials)
- **Sandboxed Code Execution** via Judge0 & Docker

---

## 🧠 Responsible Disclosure

If you responsibly disclose a vulnerability, you will:

- Be credited in our **Hall of Fame** 👑
- Optionally receive early access to new features ⚔️

---

## 🛠️ Security Tools & Dependencies

We regularly monitor our stack using:

- `npm audit`, `yarn audit`
- `Snyk`, `Dependabot`, `OWASP ZAP (manual)`
- Regular testing of WebSocket, MongoDB, and Judge0 endpoints

---

## 🧪 Future Enhancements (Planned)

- [ ] 2FA/MFA for admin panel access 🔒
- [ ] Security headers review via `helmet` strict mode
- [ ] Enhanced input sanitization using `DOMPurify`
- [ ] Logging & alerting for suspici
