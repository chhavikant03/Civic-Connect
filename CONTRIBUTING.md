# 🤝 Contributing to Civic-Connect

## 💻 Getting Started &amp; Local Setup 

### Step-by-Step Local Setup 
1\. \*\*Fork the Repository:\*\* Click \*\*Fork\*\* at the top right of the [Civic-Connect Repository](https://github.com/chhavikant03/Civic-Connect). 
2\. \*\*Clone Your Fork:\*\* \`\`\`bash git clone https://github.com/YOUR-USERNAME/Civic-Connect.git cd Civic-Connect

1. **Install Dependencies:**

```
npm install
``` 

2. **Configure Environment Variables:** Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=your_sandbox_api_key
VITE_FIREBASE_AUTH_DOMAIN=civicconnect-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=civicconnect-dev
VITE_FIREBASE_STORAGE_BUCKET=civicconnect-dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
*(Authorized development credentials can be retrieved from the pinned GitHub Discussions tab).*

3. **Start Development Server:**

```
npm run dev

```

Open `http://localhost:5173` in your browser.

## 📌 Issue Claiming &amp; Assigning

To avoid duplicate work and keep issue tracking transparent:

1. Browse open issues on the [Issues Tab](https://www.google.com/url?sa=E&amp;q=https%3A%2F%2Fgithub.com%2Fchhavikant03%2FCivic-Connect%2Fissues).
2. Comment on the issue you wish to work on expressing your interest.
3. **Wait to be assigned:** Do **not** begin working or submit a PR until a Project Admin or Mentor assigns the issue to you.
4. **Inactivity:** If there is no progress or update on an assigned issue for **3 days**, it may be reassigned to another contributor.

## 🌿 Contribution Workflow

Once an issue is assigned to you:

1. **Sync Main Branch:**

```
git checkout main
git pull origin main

```

2. **Create a Feature Branch:**

```
git checkout -b feature/issue-title
# or for bug fixes
git checkout -b fix/issue-title

```

3. **Develop &amp; Test:** Implement your changes locally and test functionality.

## 📝 Commit Message Conventions

We follow the **Conventional Commits** standard for clear commit history:

* `feat:` A new feature (e.g., `feat: add geo-location filter to complaint map`)
* `fix:` A bug fix (e.g., `fix: resolve auth redirect loop on mobile`)
* `docs:` Documentation changes (e.g., `docs: update environment setup in README`)
* `refactor:` Code changes that neither fix a bug nor add a feature
* `style:` Formatting changes (white-space, formatting, missing semi-colons)

Example:

```
git commit -m "feat: implement real-time status update badge for complaints"
```
## 🔀 Pull Request (PR) Guidelines

1. Push your feature branch to your GitHub fork:

```
git push origin feature/issue-title

```

1. Navigate to the main repository and open a **Pull Request**.
2. Fill out the PR template clearly:
  * Link the relevant issue (e.g., `Closes #12`).
  * Provide a brief summary of changes.

## 💬 Getting Support

Need help or have questions?

* **Discord:** Join the [Code Social Discord Server](https://www.google.com/url?sa=E&amp;q=https%3A%2F%2Fdiscord.gg%2FMSTNyRSPYW) and ask questions in our dedicated **Civic-Connect** project forum under `#find-a-project`[4][5].
* **GitHub Discussions:** Use the repository's Discussions tab for broader feature ideas.

Thank you for contributing to Civic-Connect! Happy Coding! 🚀
