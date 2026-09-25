# PGScout Students

PGScout Students is a student-focused accommodation platform designed to make finding and exploring PGs easier for college students.

The platform brings accommodation discovery, filtering, student-oriented information, and interactive features together in one place.

## ✨ Features

* Browse PG and accommodation listings
* Search and explore available properties
* Filter accommodation options based on student preferences
* View accommodation details and amenities
* Student-focused user experience
* User authentication
* Real-time communication features
* Backend API for handling application data
* MySQL database integration
* Payment integration support
* Email-based functionality

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Node.js
* Express.js
* Socket.IO

### Database

* MySQL
* mysql2

### Additional Technologies

* Axios
* JWT authentication
* bcryptjs
* Nodemailer
* Razorpay

## 📁 Project Structure

```text
pgscout/
├── backend/
│   ├── sql/
│   └── src/
│       ├── middleware/
│       ├── routes/
│       └── utils/
│
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* MySQL

### 1. Clone the repository

```bash
git clone https://github.com/karunamariyam/pgscout-students.git
cd pgscout-students
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

Open another terminal or return to the project root:

```bash
cd backend
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `backend` folder and add the required environment variables.

Do **not** commit `.env` files or secret credentials to GitHub.

### 5. Start the backend

From the `backend` folder:

```bash
npm start
```

If the project uses a development script, you can also use:

```bash
npm run dev
```

### 6. Start the frontend

From the `frontend` folder:

```bash
npm run dev
```

Vite will provide a local development URL in the terminal.

## 🗄️ Database

The backend uses MySQL for storing application data.

SQL setup files are available in:

```text
backend/sql/
```

Configure the database connection using environment variables rather than storing credentials directly in the source code.

## 🌐 Deployment

The application can be deployed using cloud hosting services.

For deployment, environment variables should be configured through the hosting platform and should never be committed to the repository.

## ⚠️ Project Disclaimer

PGScout Students is an academic/student project developed for educational and demonstration purposes.

The accommodation information used for demonstration should be treated as sample/demo data unless the relevant property or organization has explicitly authorized its use.

This project is not affiliated with or an official platform of any real accommodation provider unless explicitly stated.

## 🔐 Security

Sensitive information such as:

* Database credentials
* API keys
* JWT secrets
* Payment credentials
* Email credentials

must be stored in environment variables and must not be committed to the repository.

## 📌 Project Status

This project is currently under development.

Future improvements may include additional accommodation discovery features, enhanced filtering, improved real-time functionality, and further deployment optimization.
