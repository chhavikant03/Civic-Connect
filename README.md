# CivicConnect

A modern web-based civic grievance management platform that enables citizens to report municipal issues and allows administrators to efficiently manage, assign, and track complaint resolution.

Built with **React**, **Firebase**, **Tailwind CSS**, and **Shadcn/UI**.

---

## Features

### Citizen Portal
- User Authentication (Sign In / Sign Up)
- Submit new civic complaints
- Upload issue details with category and location
- Edit and delete complaints (before processing)
- Track complaint status
- View complaint history
- Responsive dashboard

### Administrator Portal
- Secure administrator login
- View all citizen complaints
- Search and filter complaints
- Assign complaints to departments
- Update complaint status
- Manage complaint lifecycle
- Analytics dashboard

---

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Shadcn/UI
- React Router DOM
- Lucide React Icons

### Backend & Database
- Firebase Authentication
- Cloud Firestore
- Firebase Storage

### State Management
- React Hooks

---

## Project Structure

```
src/
│
├── components/
│   ├── common/
│   ├── dashboard/
│   ├── forms/
│   └── ui/
│
├── pages/
│   ├── auth/
│   ├── citizen/
│   ├── admin/
│   └── landing/
│
├── firebase/
│
├── hooks/
│
├── services/
│
├── utils/
│
└── App.jsx
```

---

## Authentication

The application supports role-based access.

### Citizen
- Register
- Login
- Submit complaints
- Track complaints

### Administrator
- Login
- Review complaints
- Assign departments
- Update complaint status

---

## Complaint Workflow

1. Citizen logs in.
2. Citizen submits a complaint.
3. Complaint is stored in Cloud Firestore.
4. Administrator reviews the complaint.
5. Administrator assigns the appropriate department.
6. Complaint status is updated.
7. Citizen can monitor the progress.

---

## Database Collections

### users

Stores user profile information.

Example fields:

```
uid
name
email
role
createdAt
```

---

### issues

Stores complaint details.

Example fields:

```
complaintId
title
description
category
address
latitude
longitude
department
status
reportedBy
createdAt
updatedAt
```

---

## Future Improvements

- Real-time notifications
- Email alerts
- Complaint image uploads
- Department-wise analytics
- GIS-based complaint mapping
- Complaint priority prediction
- Mobile responsive optimization
- Dashboard charts and reports

## License

This project is intended for educational and academic purposes.

---
