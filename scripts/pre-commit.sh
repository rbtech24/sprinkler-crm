#!/bin/bash

#
# Pre-commit Hook Script
# Runs security checks, linting, and tests before allowing commits
#

set -e

echo "🔍 Running pre-commit checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
CHECKS_FAILED=0

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        CHECKS_FAILED=1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${NC}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo -e "${RED}❌ Run this script from the project root directory${NC}"
    exit 1
fi

# Backend checks
if [ -d "backend" ]; then
    print_info "Running backend checks..."
    cd backend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Installing backend dependencies..."
        npm install
    fi
    
    # Security audit
    print_info "Running npm security audit..."
    if npm audit --audit-level=moderate; then
        print_status "Security audit passed" 0
    else
        print_status "Security audit found issues" 1
        print_warning "Run 'npm audit fix' to resolve issues"
    fi
    
    # Environment security check
    print_info "Checking environment security..."
    if node scripts/generate-secrets.js --validate .env 2>/dev/null; then
        print_status "Environment security check passed" 0
    else
        print_status "Environment security check failed" 1
        print_warning "Run 'npm run security:generate' to create secure secrets"
    fi
    
    # Linting
    print_info "Running ESLint..."
    if npm run lint; then
        print_status "Linting passed" 0
    else
        print_status "Linting failed" 1
        print_warning "Run 'npm run lint:fix' to auto-fix issues"
    fi
    
    # Unit tests
    print_info "Running unit tests..."
    if npm run test:unit; then
        print_status "Unit tests passed" 0
    else
        print_status "Unit tests failed" 1
    fi
    
    # Check for sensitive files
    print_info "Checking for sensitive files..."
    SENSITIVE_FILES=""
    
    # Check for actual secrets (not dev secrets)
    if grep -q "sk_live\|pk_live\|rk_live" .env 2>/dev/null; then
        SENSITIVE_FILES="$SENSITIVE_FILES .env(live_keys) "
    fi
    
    if grep -q -v "dev_" .env | grep -q -E "JWT_SECRET|SESSION_SECRET" 2>/dev/null; then
        if ! grep -q "dev_" .env; then
            SENSITIVE_FILES="$SENSITIVE_FILES .env(prod_secrets) "
        fi
    fi
    
    # Check for other sensitive patterns
    if find . -name "*.key" -o -name "*.pem" -o -name "*.p12" | grep -q .; then
        SENSITIVE_FILES="$SENSITIVE_FILES key_files "
    fi
    
    if [ -n "$SENSITIVE_FILES" ]; then
        print_status "Sensitive files check failed" 1
        print_warning "Found sensitive files: $SENSITIVE_FILES"
        print_warning "Add these to .gitignore or use environment variables"
    else
        print_status "No sensitive files detected" 0
    fi
    
    cd ..
fi

# Frontend checks
if [ -d "frontend" ]; then
    print_info "Running frontend checks..."
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Installing frontend dependencies..."
        npm install
    fi
    
    # Type checking
    print_info "Running TypeScript type check..."
    if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
        print_status "Type checking passed" 0
    else
        print_status "Type checking failed" 1
    fi
    
    # Linting
    print_info "Running frontend linting..."
    if npm run lint 2>/dev/null || npx next lint 2>/dev/null; then
        print_status "Frontend linting passed" 0
    else
        print_status "Frontend linting failed" 1
    fi
    
    cd ..
fi

# Git checks
print_info "Running git-specific checks..."

# Check for large files
print_info "Checking for large files..."
LARGE_FILES=$(git diff --cached --name-only | xargs -I {} find . -name {} -size +10M 2>/dev/null || true)
if [ -n "$LARGE_FILES" ]; then
    print_status "Large files check failed" 1
    print_warning "Found large files: $LARGE_FILES"
    print_warning "Consider using Git LFS for large files"
else
    print_status "No large files detected" 0
fi

# Check for debug statements
print_info "Checking for debug statements..."
DEBUG_FILES=""
git diff --cached --name-only | while read file; do
    if [ -f "$file" ] && (git show ":$file" | grep -qE "console\.(log|debug|trace|warn)\(|debugger;|TODO:|FIXME:"); then
        DEBUG_FILES="$DEBUG_FILES $file"
    fi
done

if [ -n "$DEBUG_FILES" ]; then
    print_warning "Found debug statements in: $DEBUG_FILES"
    print_warning "Consider removing debug statements before committing"
fi

# Check commit message format (if available)
if [ -f ".git/COMMIT_EDITMSG" ]; then
    COMMIT_MSG=$(head -n 1 .git/COMMIT_EDITMSG)
    if echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .+"; then
        print_status "Commit message format valid" 0
    else
        print_warning "Commit message doesn't follow conventional format"
        print_warning "Use: type(scope): description"
        print_warning "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build"
    fi
fi

# Final summary
echo ""
print_info "Pre-commit check summary:"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Commit can proceed.${NC}"
    exit 0
else
    echo -e "${RED}💥 Some checks failed. Please fix the issues before committing.${NC}"
    echo ""
    echo "Quick fixes:"
    echo "  - npm run lint:fix          # Auto-fix linting issues"
    echo "  - npm audit fix             # Fix security vulnerabilities" 
    echo "  - npm run security:generate # Generate secure secrets"
    echo "  - npm test                  # Run tests to see specific failures"
    echo ""
    exit 1
fi