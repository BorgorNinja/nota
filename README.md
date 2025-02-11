# Nota - A Simple Note-Taking Web App

## Overview
Nota is a lightweight note-taking web application that allows users to create, edit, and delete notes. It features a modern UI with smooth animations and a user authentication system.

## Features
- User authentication (login, registration, and password reset)
- Create, edit, and delete notes
- Responsive design for mobile and desktop
- Animated introduction screen
- Styled with CSS animations and gradients

## Installation
### Prerequisites
- A web server (e.g., Apache, Nginx, or XAMPP for local development)
- PHP 7+ (for backend authentication and note storage)
- MySQL database (optional for persistent note storage)

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/nota.git
   ```
2. Navigate into the project directory:
   ```sh
   cd nota
   ```
3. Set up a local server (for XAMPP, place files inside `htdocs`).
4. Configure the backend:
   - Create a MySQL database and import `database.sql` (if provided).
   - Update `config.php` with your database credentials.
5. Start your server and access the app via `http://localhost/nota/`.

## File Structure
```
nota/
│── index.html			# Main frontend file
│── styles.css			# Styling file
│── scripts.js			# JavaScript file
│── notes.php			# Backend script for handling notes
│── login.php			# Authentication script
│── register.php		# User registration script
│── reset_password.php	# Password reset script
│── logout.php			# Logout handler
└── config.php			# Database configuration
```

## Usage
- Open the website in a browser.
- Register an account or log in.
- Click the `+` button to add a note.
- Edit notes directly by clicking inside the text area.
- Click `×` to delete a note.
- Click `Logout` to end your session.

## Contributing
Feel free to contribute by submitting pull requests. Follow standard coding guidelines and ensure your code is well-documented.

## License
This project is licensed under the GNU General Public License. See `LICENSE` for details.

