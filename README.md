# 🏙️ Civic-Connect
### Empowering Communities Through Transparent Civic Engagement & Issue Resolution

                        🌐 **Live Demo:** [Explore Civic Connect Here](https://civic-connect-enim.vercel.app/)

Civic-Connect is an open-source digital platform designed to bridge the gap between citizens and local municipal authorities. It enables residents to report non-emergency civic issues—such as potholes, broken streetlights, garbage accumulation, and water supply disruptions—and track their resolution transparently.

## 🌟 Key Features

- 📌 **Issue Reporting** — Report civic issues with descriptions, location details.
- 📊 **Admin Dashboard** — Manage, categorize, prioritize, and resolve reported issues efficiently.
- 📍 **Location-Based Reporting** — Support geo-tagged complaints for better identification of civic problems.
- 📱 **Responsive UI** — Access the platform through a clean, mobile-friendly interface.
- 🔐 **Secure Authentication** — Firebase Authentication for user registration and login.
- ☁️ **Cloud Database** — Store and manage complaint data using Firebase Cloud Firestore.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React + Vite | Frontend development |
| HTML5, CSS3, JavaScript | Web technologies |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database and real-time updates |
| Firebase Storage | Image and file storage |
| Git & GitHub | Version control and collaboration |

## 🚀 Getting Started

Follow the steps below to run Civic-Connect locally.

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) — Version 16 or higher
- [Git](https://git-scm.com/)
- A Firebase configuration with the required permissions
- Visual Studio Code 

### 1. Fork the Repository

Click the **Fork** button at the top-right of the repository page to create your own copy.

### 2. Clone Your Fork

Replace `YOUR-USERNAME` with your GitHub username.

```bash
git clone https://github.com/YOUR-USERNAME/Civic-Connect.git
cd Civic-Connect
```

### 3. Install Dependencies

```bash
npm install
```

> **Note:** If the project is configured to generate `.env` from `.env.example`, verify that this step creates the file. Otherwise, copy `.env.example` to `.env` manually.

### 4. Configure Environment Variables

Create or open the `.env` file in the project root and configure the following Firebase environment variables:

```env
VITE_FIREBASE_API_KEY=your_sandbox_api_key
VITE_FIREBASE_AUTH_DOMAIN=civicconnect-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=civicconnect-dev
VITE_FIREBASE_STORAGE_BUCKET=civicconnect-dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**WHERE TO FIND THE DEVELOPMENT CREDENTIALS**

Refer to the **PINNED GITHUB DISCUSSION** for the authorized development sandbox configuration.

> ⚠️ **Important:** Use only authorized development credentials. Never commit your `.env` file or private service-account credentials to GitHub. Firebase client configuration is not a substitute for properly configured Firebase Security Rules.

### 5. Start the Development Server

```bash
npm run dev
```

Open the following URL in your browser:

**http://localhost:5173**

You're all set! 🎉

## RUNNING THE PROJECT 

1. ADMIN LOGIN IS ALREADY THERE . 
2. FOR THE CITIZEN , FIRST SIGNUP TO CREATE YOUR TEST ACCOUNT AND THEN YOU CAN USE THAT SAME ACCOUNT YOU CREATED UNDER SIGNIN TAB. 

## 🤝 Contributing

We welcome contributions from participants of **Winter of Code Social 2026 (WOCS)** and the open-source community.

### Contribution Guidelines

1. **Explore Issues:** Browse the repository's Issues tab and by running your cloned repo on local host.
2. **Get Assigned:** Comment on the issue and wait for assignment before starting work.
3. **Fork and Clone:** Fork the repository and clone your fork locally.
4. **Create a Feature Branch:**

   ```bash
   git checkout -b feature/issue-description
   ```

5. **Make Your Changes:** Follow the existing code style and project conventions.
6. **Commit Your Changes:**

   ```bash
   git add .
   git commit -m "feat: add status badge component to user dashboard"
   ```

7. **Push Your Branch:**

   ```bash
   git push origin feature/issue-description
   ```

8. **Submit a Pull Request:** Open a PR from your feature branch to the repository's `main` branch. Reference the relevant issue and describe your changes clearly.

### Commit Message Convention

Use descriptive commit messages, preferably following the Conventional Commits format:

- `feat:` — New features
- `fix:` — Bug fixes
- `refactor:` — Code improvements
- `test:` — Test-related changes


## 👨‍💻 Project Admin

**Chhavi kant**

- GitHub: [@chhavikant03](https://github.com/chhavikant03)
- Linkedin : [Chhavi Kant](https://www.linkedin.com/in/chhavi-kant-959bb1306/)
---

⭐ If you find Civic-Connect useful, consider starring the repository and contributing to its development.

**Together, let's build cleaner, safer, and more connected communities!** 🏙️
