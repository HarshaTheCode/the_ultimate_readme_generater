# Project Context: The Ultimate README Generator

## Project Overview
This project, "The Ultimate README Generator," is an AI-powered application designed to analyze GitHub repositories and automatically generate comprehensive and professional `README.md` files. It leverages Google's generative AI for content analysis, interacts with the GitHub API (via Octokit) to fetch repository data, and is built using Next.js, Tailwind CSS for styling, and MongoDB for data persistence. The application provides a user-friendly interface for authenticating with GitHub, selecting repositories, and generating/downloading READMEs.

## Building and Running

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/the_ultimate_readme_generater.git
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory with the following variables:
    ```env
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret
    NEXTAUTH_SECRET=your_nextauth_secret
    MONGODB_URI=your_mongodb_connection_string
    ```

### Running the Development Server
To start the application in development mode:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### API Endpoints
The application exposes the following key API endpoints:
*   `POST /api/auth/callback/github`: Handles GitHub OAuth callbacks.
*   `GET /api/repos`: Fetches accessible GitHub repositories for the authenticated user.
*   `POST /api/generate`: Initiates the README generation process for a specified repository.
*   `GET /api/repos/:owner/:repo/readme`: Retrieves a previously generated README for a given repository.

## Development Conventions

### Technologies Used
*   **Framework:** Next.js
*   **Styling:** Tailwind CSS
*   **Backend/API:** Node.js, Express.js (implied by Next.js API routes), MongoDB
*   **Authentication:** NextAuth.js (implied by `NEXTAUTH_SECRET` and auth routes)
*   **AI:** Google's generative AI
*   **GitHub Integration:** Octokit
*   **Language:** TypeScript

### Code Structure
The project follows a typical Next.js application structure with:
*   `src/app`: Contains application pages and API routes.
*   `src/components`: Reusable UI components.
*   `src/hooks`: Custom React hooks for logic encapsulation.
*   `src/lib`: Utility functions, API clients, and core logic (e.g., AI README generation, GitHub client, database schema).
*   `src/types`: TypeScript type definitions.

### Contributing
The standard contribution workflow involves:
1.  Forking the repository.
2.  Creating a feature branch (`git checkout -b feature/your-feature`).
3.  Committing changes (`git commit -m 'Add some feature'`).
4.  Pushing to the feature branch (`git push origin feature/your-feature`).
5.  Opening a Pull Request.

### Linting and Formatting
The presence of `eslint.config.mjs` and `.prettierrc` indicates that ESLint and Prettier are used for code linting and formatting, respectively. Developers should ensure their contributions adhere to these configurations.

### Testing
(No explicit testing commands or frameworks were found in the `README.md`. A placeholder for testing information would be appropriate here if more details were available.)
