#!/usr/bin/env bash
# 一键发布到 GitHub Pages（需先完成 gh auth login）
# 用法：bash deploy-gh.sh [仓库名]
set -euo pipefail

REPO="${1:-yanxuanjia-ppt-skills-web}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

command -v gh >/dev/null || { echo "缺少 gh CLI：https://cli.github.com/"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "先执行：gh auth login"; exit 1; }

USER_LOGIN="$(gh api user --jq .login)"
echo "→ 账号：$USER_LOGIN  仓库：$REPO"

if [ ! -d .git ]; then
  git init -q
  git branch -M main
fi

git add -A
git diff --cached --quiet || git commit -q -m "chore: 更新 PPT Skills 图鉴 $(date +%Y-%m-%d\ %H:%M)"

# 仓库不存在则创建（Pages 免费版需 public）
if ! gh repo view "$USER_LOGIN/$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source=. --remote=origin --description "研选家 PPT Skills 图鉴" --push
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER_LOGIN/$REPO.git"
  git push -u origin main
fi

# 开启 Pages（main / root）
gh api -X POST "repos/$USER_LOGIN/$REPO/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  || gh api -X PUT "repos/$USER_LOGIN/$REPO/pages" \
     -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  || echo "（Pages 可能已开启，跳过）"

echo ""
echo "✓ 已推送。构建约 1 分钟后生效："
echo "  https://$USER_LOGIN.github.io/$REPO/"
echo ""
echo "后续更新只需：bash deploy-gh.sh"
