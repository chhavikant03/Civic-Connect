🏙️ Civic-Connect

Empowering Communities Through Transparent Civic Engagement & Issue Resolution

Civic-Connect is an open-source digital platform designed to bridge the gap between citizens and local municipal authorities. It enables residents to report non-emergency civic issues—such as potholes, streetlight failures, garbage accumulation, and water supply disruptions—directly to local administration with real-time tracking.

🌟 Key Features

📌 Issue Reporting: Geo-tagged reporting with visual upload support.

⏱️ Real-Time Tracking: Transparent status updates from report submittal to resolution.

📊 Admin Dashboard: Categorized queue management and issue prioritization.

📱 Responsive UI: Clean, mobile-friendly interface for seamless reporting.

🛠️ Tech Stack

Frontend: HTML5, CSS3, JavaScript / React (Vite)

Backend & Database: Firebase (Authentication & Cloud Firestore)

Version Control: Git & GitHub

🚀 Getting Started

Follow these steps to set up Civic-Connect locally on your machine.

Prerequisites

Node.js (v16.x or higher)

Git

Local Installation

Fork the Repository

Click the Fork button at the top right of this page.

Clone your Fork

git clone https://github.com/YOUR-USERNAME/Civic-Connect.git
cd Civic-Connect


Install Dependencies

npm install


(Running npm install automatically creates your local .env file from .env.example.)

Environment Setup

Open the .env file created in your root directory. Replace the placeholder values with our active Dev Sandbox Firebase Keys:

🔑 Where to find dev keys: Copy the credentials from our pinned GitHub Discussion.

VITE_FIREBASE_API_KEY=your_sandbox_api_key
VITE_FIREBASE_AUTH_DOMAIN=civicconnect-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=civicconnect-dev
VITE_FIREBASE_STORAGE_BUCKET=civicconnect-dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id


Run the Application

npm run dev


Open http://localhost:5173 in your browser to view the app.

🤝 Contributing (Social Winter of Code 2026)

We welcome contributions from Social Winter of Code 2026 participants!

Contribution Steps:

Browse the open tasks under the Issues Tab.

Comment on an issue to get assigned before writing code.

Create a descriptive feature branch:

git checkout -b feature/issue-description


Commit your changes with clear messages:

git commit -m "feat: add status badge component to user dashboard"


Push to your fork and submit a Pull Request (PR) targeted to the main branch.

📄 License

Distributed under the MIT License.

👨‍💻 Project Admin

Chhavikant

GitHub: @chhavikant03
