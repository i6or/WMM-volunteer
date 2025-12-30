# Team Collaboration Guide

## 🚀 Getting Started

### Option 1: Work Locally with Cursor (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/i6or/WMM-volunteer.git
   cd WMM-volunteer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` (if it exists)
   - Add your database credentials and API keys

4. **Open in Cursor**
   - Open the project folder in Cursor
   - The `.cursorrules` file will automatically configure AI assistance

5. **Start development**
   ```bash
   npm run dev
   ```

### Option 2: Work Online with GitHub Codespaces

1. **Create a Codespace**
   - Go to: https://github.com/i6or/WMM-volunteer
   - Click the green "Code" button
   - Select "Codespaces" tab
   - Click "Create codespace on main"
   - Wait for the environment to load (2-3 minutes)

2. **Work in the browser**
   - Files are stored in the cloud
   - Edit directly in VS Code (web version)
   - Changes are automatically saved

3. **Access your codespace**
   - Each team member can create their own codespace
   - Codespaces persist for 30 days of inactivity
   - You can resume your codespace anytime

## 👥 Team Workflow

### Working on Features

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code in Cursor
   - Test locally
   - Commit frequently with clear messages

3. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Go to GitHub and create a Pull Request
   - Request review from team members
   - Merge after approval

### Daily Workflow

1. **Start of day: Pull latest changes**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create your feature branch**
   ```bash
   git checkout -b feature/your-work
   ```

3. **End of day: Push your work**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-work
   ```

## 🔧 Using Cursor AI Together

### Shared AI Context
- The `.cursorrules` file is shared by all team members
- It contains project context, coding standards, and best practices
- Update it when project patterns change

### AI-Assisted Development
- Use Cursor's AI chat for code suggestions
- Ask questions about the codebase
- Generate boilerplate code following project patterns

## 📁 File Organization

- **Frontend code**: `client/src/`
- **Backend code**: `server/`
- **Shared types**: `shared/`
- **Database migrations**: Use `npm run db:push`

## 🐛 Troubleshooting

### Git Conflicts
If you get merge conflicts:
```bash
git pull origin main
# Resolve conflicts in Cursor
git add .
git commit -m "Resolve merge conflicts"
```

### Environment Issues
- Make sure `.env` file is set up correctly
- Check that database connection is working
- Verify Node.js version (20.x recommended)

### Codespace Issues
- Codespace not loading? Try creating a new one
- Port not forwarding? Check the "Ports" tab in VS Code
- Need more resources? Upgrade your GitHub plan

## 💡 Best Practices

1. **Commit often** - Small, frequent commits are better than large ones
2. **Write clear commit messages** - Describe what and why, not how
3. **Test before pushing** - Make sure `npm run dev` works
4. **Use branches** - Never commit directly to `main`
5. **Review code** - Always get a second pair of eyes on your PRs
6. **Update `.cursorrules`** - Keep AI context current

## 🔐 Security Notes

- Never commit `.env` files
- Don't share API keys in chat
- Use environment variables for secrets
- Review PRs for security issues

## 📞 Getting Help

- Check existing documentation in the repo
- Ask in team chat/Slack
- Review GitHub Issues
- Use Cursor AI to understand code patterns

## 🌐 Online vs Local Work

### When to use Local (Cursor):
- ✅ Better performance
- ✅ Full Cursor AI features
- ✅ Offline work capability
- ✅ Better for large refactors

### When to use Codespaces:
- ✅ Quick fixes from any device
- ✅ No local setup needed
- ✅ Consistent environment
- ✅ Easy onboarding for new team members

---

**Repository**: https://github.com/i6or/WMM-volunteer  
**Main Branch**: `main`  
**Default Port**: 5000

