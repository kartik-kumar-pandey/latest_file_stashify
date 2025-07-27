# FileStashify

> **See the full workflow and architecture:** [WORKFLOW.md](./WORKFLOW.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![Supabase](https://img.shields.io/badge/Supabase-Storage-green) ![Cloudinary](https://img.shields.io/badge/Cloudinary-Images-orange)

A modern cloud storage frontend using Supabase Storage and Cloudinary for comprehensive file management.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Setup Guide](#setup-guide)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Author](#author)
- [License](#license)

---

## About

FileStashify is a React-based frontend application that provides a seamless interface to manage your cloud files using both Supabase Storage and Cloudinary. It offers a user-friendly UI that reduces the complexity of storing and accessing files, providing various functions for efficient file management. It supports user authentication, file and folder management, file sharing with expiring links, and file previews — all in a modern, intuitive UI with professional hover effects and animations.

---

## Features

- **🔐 Authentication**: User sign up, sign in, and sign out
- **☁️ Dual Cloud Storage**: Supabase Storage for files and Cloudinary for images/videos
- **📁 File Management**: Create, upload, download, and delete files and folders
- **🔗 Smart Sharing**: Share files with expiring signed URLs (Supabase) and direct links (Cloudinary)
- **👁️ File Preview**: Preview images, PDFs, and text files directly in the app
- **📱 Responsive Design**: Modern UI with modals for sharing, viewing, and error handling
- **✨ Enhanced UX**: Professional button effects, hover animations, and smooth transitions
- **🌙 Dark Mode**: Support for both light and dark themes
- **📂 Drag & Drop**: Intuitive drag and drop file upload functionality

---

## Demo

*Add screenshots or GIFs here to showcase the app UI and features.*

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/file-stashify.git
   cd file-stashify
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm start
   ```

4. **Open your browser and navigate to `http://localhost:3000`.**

---

## Setup Guide

### Supabase Setup

1. **Create a Supabase account** at [https://supabase.com](https://supabase.com) and log in.
2. **Create a new Supabase project** with a name and database password.
3. **Enable authentication** in the Supabase dashboard:
   - Go to **Authentication** and enable email/password or OAuth providers.
4. **Create a storage bucket**:
   - Go to **Storage** and create a bucket (e.g., `user-files`).
   - Set bucket privacy as needed.
5. **Set bucket access policies**:
   - Go to the **Policies** tab under your storage bucket.
   - Use the **Other policies under storage.objects** option to add policies.
   - Example policy to allow authenticated users to upload files:
     ```sql
     (auth.role() = 'authenticated')
     ```
   - Add policies to allow users to read/download and delete their own files based on metadata or naming conventions.
6. **Get API credentials**:
   - Go to **Settings > API** in the Supabase dashboard.
   - Copy the **URL** and **anon public** API key.

### Cloudinary Setup

1. **Create a Cloudinary account** at [https://cloudinary.com](https://cloudinary.com).
2. **Get your credentials**:
   - Go to **Dashboard** and copy your **Cloud Name**.
3. **Configure upload preset** (optional):
   - Go to **Settings > Upload** and create an unsigned upload preset for public uploads.

### App Configuration

1. **Enter Supabase credentials** in the app's initialization screen:
   - Supabase URL
   - Anon key
   - Storage bucket name
2. **Enter Cloudinary credentials**:
   - Cloud Name
3. **Click "Initialize"** to connect the app to your cloud services.

---

## Usage

- **Sign up or sign in** using your email and password
- **Create folders** and organize your files
- **Upload files** using the fixed "Choose File" button or drag & drop
- **Navigate folders** by clicking on folder cards
- **Download files** using the download button
- **Share files** with expiring links (Supabase) or direct links (Cloudinary)
- **Preview supported files** directly in the app
- **Delete files or folders** using the delete button

---

## Technologies Used

- [React](https://reactjs.org/) - Frontend UI library
- [Supabase](https://supabase.com/) - Backend as a service (authentication, storage)
- [Cloudinary](https://cloudinary.com/) - Cloud image and video management
- [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Programming language
- CSS3 with advanced animations and effects

---

## Author

**Kartik Kumar Pandey**

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
