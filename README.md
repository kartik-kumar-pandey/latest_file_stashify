# FileStashify

> **See the full workflow and architecture:** [WORKFLOW.md](./WORKFLOW.md)

## Visual Workflow Diagram

```mermaid
flowchart TD
  %% Entry Point
  Start([User opens app])

  %% Initialization
  subgraph INIT["Initialization"]
    style INIT fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    Init1([Prompt for Supabase URL, Anon Key, Bucket Name])
    Init2([Validate bucket exists via Supabase API])
    Init3([Save credentials to localStorage])
    Init4([Create Supabase client])
    Start --> Init1 --> Init2 --> Init3 --> Init4
  end

  %% Authentication
  subgraph AUTH["Authentication"]
    style AUTH fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    Auth1([Show login/signup form])
    Auth2([User enters email/password])
    Auth3([Sign In: supabase.auth.signInWithPassword])
    Auth4([Sign Up: supabase.auth.signUp])
    Auth5([Google OAuth: supabase.auth.signInWithOAuth])
    Auth6([Session set in React state])
    Auth7([Show error if failed])
    Auth8([Listen for auth state changes])
    Auth9([Session auto-restored on reload])
    Init4 --> Auth1
    Auth1 --> Auth2
    Auth2 --> Auth3 --> Auth6
    Auth2 --> Auth4 --> Auth6
    Auth1 --> Auth5 --> Auth6
    Auth3 --> Auth7
    Auth4 --> Auth7
    Auth5 --> Auth7
    Auth6 --> Auth8 --> Auth9
  end

  %% Main App
  subgraph MAIN["Main App Workflow"]
    style MAIN fill:#e8f5e9,stroke:#43a047,stroke-width:2px
    Main1([User authenticated])
    Main2([Show topbar, file manager, dark mode toggle])
    Main3([FileManager fetches files/folders from Supabase])
    Main4([User uploads files])
    Main5([Check for duplicates, call supabase.storage.upload])
    Main6([Create folder: upload .placeholder file])
    Main7([Rename/Delete/Move: call Supabase API])
    Main8([Update file/folder list])
    Main9([Preview file: download, create blob URL, show modal/page])
    Main10([Download file: create signed URL, trigger download])
    Main11([Share file: create signed URL, generate preview/share link])
    Main12([Show guide/help])
    Auth9 --> Main1
    Main1 --> Main2 --> Main3
    Main3 --> Main4 --> Main5 --> Main8
    Main3 --> Main6 --> Main8
    Main3 --> Main7 --> Main8
    Main3 --> Main9
    Main3 --> Main10
    Main3 --> Main11
    Main2 --> Main12
  end

  %% Password Reset
  subgraph PWRESET["Password Reset"]
    style PWRESET fill:#fce4ec,stroke:#d81b60,stroke-width:2px
    PW1([User clicks Forgot Password])
    PW2([Call supabase.auth.resetPasswordForEmail])
    PW3([User receives email])
    PW4([User clicks recovery link with access_token])
    PW5([Show ResetPasswordPage])
    PW6([User sets new password])
    PW7([Set session with access_token])
    PW8([Call supabase.auth.updateUser])
    PW9([Show success or error])
    Auth1 -.-> PW1
    PW1 --> PW2 --> PW3 --> PW4 --> PW5 --> PW6 --> PW7 --> PW8 --> PW9
  end

  %% Share/Preview Pages
  subgraph SHARE["Share & Preview Pages"]
    style SHARE fill:#ede7f6,stroke:#7c3aed,stroke-width:2px
    S1([User opens /share or /preview page])
    S2([Read file path, bucket, signed URL from query])
    S3([Check Supabase credentials in localStorage])
    S4([Validate link expiry])
    S5([Download/display file if valid])
    S6([Show error if invalid/expired])
    Main11 --> S1
    S1 --> S2 --> S3 --> S4
    S4 -- valid --> S5
    S4 -- expired/invalid --> S6
  end

  %% Logout
  subgraph LOGOUT["Logout"]
    style LOGOUT fill:#fbe9e7,stroke:#d84315,stroke-width:2px
    L1([User clicks Logout])
    L2([Call supabase.auth.signOut])
    L3([Session cleared from state])
    L4([Return to login screen])
    Main2 --> L1
    L1 --> L2 --> L3 --> L4
    L4 -.-> Auth1
  end
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![Supabase](https://img.shields.io/badge/Supabase-Storage-green)

A modern cloud storage frontend using Supabase Storage.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Supabase Setup Guide](#supabase-setup-guide)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Author](#author)
- [License](#license)

---

## About

FileStashify is a React-based frontend application that provides a seamless interface to manage your cloud files using Supabase Storage. It offers a user-friendly UI that reduces the complexity of storing and accessing files directly from Supabase, providing various functions for efficient file management. It supports user authentication, file and folder management, file sharing with expiring links, and file previews — all in a modern, intuitive UI.

---

## Features

- User sign up, sign in, and sign out
- Initialize connection with your Supabase project and storage bucket
- Create, upload, download, and delete files and folders
- Share files with expiring signed URLs
- Preview images, PDFs, and text files directly in the app
- Responsive and modern UI with modals for sharing, viewing, and error handling

---

## Demo

*Add screenshots or GIFs here to showcase the app UI and features.*

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/file-stashify.git
   cd filestashify
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## Supabase Setup Guide

1. Create a Supabase account at [https://supabase.com](https://supabase.com) and log in.
2. Create a new Supabase project with a name and database password.
3. Enable authentication in the Supabase dashboard:
   - Go to **Authentication** and enable email/password or OAuth providers.
4. Create a storage bucket:
   - Go to **Storage** and create a bucket (e.g., `user-files`).
   - Set bucket privacy as needed.
5. Set bucket access policies:
   - Go to the **Policies** tab under your storage bucket.
   - Use the **Other policies under storage.objects** option to add policies.
   - Example policy to allow authenticated users to upload files:
     ```sql
     (auth.role() = 'authenticated')
     ```
   - Add policies to allow users to read/download and delete their own files based on metadata or naming conventions.
6. Get API credentials:
   - Go to **Settings > API** in the Supabase dashboard.
   - Copy the **URL** and **anon public** API key.
7. Configure the app:
   - Enter the Supabase URL, anon key, and storage bucket name in the app's initialization screen.
   - Click **Initialize Supabase** to connect the app to your Supabase project.

---

## Usage

- Sign up or sign in using your email and password.
- Create folders, upload files, navigate folders, download files, and delete files or folders.
- Share files with expiring links using the share button.
- Preview supported file types directly in the app.

---

## Technologies Used

- [React](https://reactjs.org/) - Frontend UI library
- [Supabase](https://supabase.com/) - Backend as a service (authentication, storage)
- [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Programming language
- CSS for styling

---

## Author

Kartik Kumar Pandey

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
